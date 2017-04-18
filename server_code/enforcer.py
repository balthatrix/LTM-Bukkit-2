import psutil
import sys
import os
import time
import signal

pid = -1 #process id
sid = -1 #server id
mcproc = -1 #psutil proc object


#presets
process_crazy_sample = 50 #time to sample the mcproc.
process_crazy_cutoff = 150 #cpu average to determin "crazy"
heartbeat_fuzz_interval = 180 #second leeway time to consider not "current" in db
pool_timeout = 10 #second inbetween checks of cpu/heartbeat DB
status_trip_cutoff = 3 #cycles for status to be anything besides OPEN to determine kill
#last log line??

def setup():
    """
        Setup gets the pid arg
    """
    if len(sys.argv) is not 2:
        print "Not enough args. Expected 3 args.";
        return False
    else:
        try:
            global sid
            sid = int(sys.argv[1])
            global pid 
            pid = -1
            while pid == -1:
                try:
                    st = os.popen('ps -u mc%d | grep java' % sid).read().strip().split()[0]
                    pid = int(st)
                except Exception, e:
                    print e
                time.sleep(5)
            global mcproc
            mcproc = psutil.Process(pid)
            print "Sid was: %d Pid was: %d" % (sid, pid)
            if sid == -1 or pid == -1:
                print 'sid/pid parse exception. sid(%d) pid(%d)' % (sid, pid)
                return False
        except Exception, e:
            print e
            return False
    return True

def enforce():
    """ main loop - checks cpu/db and will kill server and exit if server is bad """
    last_status = "OPEN"
    status_trips = 0
    time.sleep(60)
    while True:
        #CPU check.
        try:
            print 'Checking if proc is going crazy... ',
            sys.stdout.flush()
            if is_proc_going_crazy(mcproc):
                print 'Process was determined to be going crazy.'
                killproc(mcproc)
                return
            else:
                print 'Process CPU appears normal.'
        except Exception, e:
            print "Could not get process for pid %d" % pid
            print e
            return #quit script
        #DB check.
        try:
            print 'Checking DB... ',
            sys.stdout.flush()
            if not is_server_current_in_db(sid):
                print 'Server was not current in database... '
                killproc(mcproc)
                return
            else:
                print 'Server appears normal in database'
        except Exception, e:
            print 'Failed to check database...'
            print e
            killproc(mcproc)
            return #quit script
        #status check.
        try:
            print 'Checking status... ',
            status = server_status(sid)
            status = status.strip()
            st_string = '%s %s' % (status, last_status)
            print st_string,
            if weird_status(status) and weird_status(last_status):
                print 'Server was in a non-OPEN/IN_USE state'
                print 'Current state: %s' % status
                print 'Last state: %s' % last_status
                status_trips += 1
                if status_trips > status_trip_cutoff:
                    print 'Server was in a weird status too many times. Killing'
                    killproc(mcproc)
                    return
            else:
                print 'normal. Reseting status_trips.'
                status_trips = 0
            last_status = status
        except Exception, e:
            print 'Failed in checking status...'
            print e
            killproc(mcproc)
            return


        time.sleep(pool_timeout)

def weird_status(st):
    if st == "OPEN" or st == "IN_USE":
        return False
    else:
        return True

def killproc(mcproc):
    """
        won't stop until the process is dead!!!!
    """
    print ('Killing process %d... ' % pid),
    sys.stdout.flush()
    try:
        while mcproc.is_running():
            os.kill(pid, signal.SIGKILL)
            time.sleep(2)
    except Exception, e:
        print 'Error in kill:'
        print e
    print 'killed.'
    return True

def get_mcproc_usage(mcproc, inter=3):
    """ 
        gets the average CPU usage for a given process over a given interval
        note this function is blocking
    """
    return mcproc.cpu_percent(interval=inter)


def is_proc_going_crazy(mcproc):
    """
        determins if the process is using too much CPU based upon defined presets
        of process_crazy_cutoff and the time to sample, process_crazy_sample
    """
    usage = get_mcproc_usage(mcproc, process_crazy_sample)
    if usage > process_crazy_cutoff:
        return True
    return False

def server_status(server_id):
    """
        returns a string of the server status in the DB
    """
    status = os.popen('mysql -u heartbeat -pheartbeatpass heartbeat -s -N -e "select status from status where server_id=%d order by timestamp desc limit 1"' % sid).read()
    return status
def is_server_current_in_db(server_id):
    """
        Checks if the sid (server_id) has a recent row in the heartbeat status table.
        Just using a quick os.popen instead of dealing with a mysql lib

        uses the preset heartbeat_fuzz_interval to determine if it's 'old' or not. 
    """
    latest_dbstamp = os.popen('mysql -u heartbeat -pheartbeatpass heartbeat -s -N -e "select unix_timestamp(timestamp) from status where server_id=%d order by timestamp desc limit 1"' % sid).read()
    if latest_dbstamp == '': #no result!
        return False
    current_time = int(time.time())
    if (current_time - heartbeat_fuzz_interval) > int(latest_dbstamp):
        return False
    return True

#after defining functions, this code is exec'd
if setup():
    enforce()
else:
    print 'Setup returned false. Exiting.'

print 'Enforcement ended. Exiting...'

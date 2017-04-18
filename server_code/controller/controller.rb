#!/usr/bin/ruby

 
require 'sinatra'
require 'aws-sdk'
require 'open-uri'
require 'find'
require 'json'
require 'net/http'
require 'fileutils'

set :port, 4567
set :bind, '0.0.0.0'



def log(s)
  puts s
  logfile = "#{File.dirname(__FILE__)}/controller_log.txt"
  File.open(logfile,"a"){|f| f.write("#{s}\n")}
  STDOUT.flush
end

@@api_key_secret = nil
@@mcname = nil
@@java_controller = nil
@@world_downloader = nil
@@shutting_down = false
@@world_key = nil
@@world_secret = nil


log "Starting controller"


#Just for testing
get "/" do

end


#Takes an API key/secret, stores it to verify future API calls
get '/ping' do
  respond_to = params[:respond_to]
  api_key_id = params[:api_key_id]
  @@api_key_secret = params[:api_key_secret]
  @@world_key = params[:world_k]
  @@world_secret = params[:world_s]
  world_name   = params["world_name"] || params["canonical_name"]
  world_origin = params["world_start"] || params["start"]
  log "World info: wn: #{world_name}, wo: #{world_origin}"

  if params[:mcname] #Will be blank if it's the user's very first login on an LTM server
	  @@mcname = params[:mcname] 
	  scripts_dir = "./scripts/#{@@mcname}"
	  FileUtils.mkdir_p(scripts_dir)
  end


  Thread.new{
    File.open("./plugins/ThoughtStem/config.yml","w") do |file|
	file.puts "base_url: #{respond_to}"
	file.puts "server_id: #{api_key_id}"
	file.puts "server_secret: #{@@api_key_secret}"
    end

    log "Going to download this!!!! #{world_name}"
    if @@world_downloader.nil?
      @@world_downloader = WorldDownloader.new
      @@world_downloader.download(world_name, world_origin)
    end
    @@java_controller = JavaController.new if @@java_controller.nil? #This starts the server
  }

  "Downloading world!"
end

#Returns the current MC logs
get '/logs' do
  @@java_controller.logs.gsub("\n","<br/>") rescue "No logs yet"
end

get '/all_logs' do
  @@java_controller.all_logs.gsub("\n","<br/>") rescue "No logs yet"
end
get '/cmd' do
  check_auth(params[:api_key_secret])

  @@java_controller.cmd params[:run]
end

get '/mc_crashed' do
  @@java_controller.crashed?.to_s
end

get '/world_uploaded' do 
  @@world_downloader.uploaded.to_s
end

post '/scripts' do
  check_auth(params[:api_key_secret])

  @@mcname = params[:mcname]
  scripts_dir = "./scripts/#{@@mcname}"
  FileUtils.mkdir_p(scripts_dir)

  deployment = JSON.parse(params[:deployment])

  deployment.to_a.each do |k,v|
    File.open("./scripts/#{@@mcname}/#{k}.js","w") do |f|
      f.write(v) 
    end
  end

  "Saved some scripts"
end

get '/shutdown' do
  check_auth(params[:api_key_secret])

  if @@shutting_down
    return "Already shutting down"
  end


  @@java_controller.cmd "stop"

  @@shutting_down = true 

  Thread.new{
    count = 0
    success = false
    while(count < 10) do
      log "Waiting for MC to shut down"
      if(@@java_controller.stopped? or @@java_controller.crashed?)
	"Looks like minecraft crashed.  Saving world anyhow." if @@java_controller.crashed?
	success= true
	break
      end

      sleep(10)
      count += 1 
    end

    if(success)
      @@world_downloader.upload 
    end 
  }

  "Shutting down"
end


def check_auth(api_key_secret)
  if(api_key_secret != @@api_key_secret || @@api_key_secret.nil?)
    raise "Security violation #{api_key_secret} != #{@@api_key_secret}"
  end
end




class WorldDownloader
  def initialize
    @uploaded = false
    Aws.config.update({ region: 'us-east-1', credentials: Aws::Credentials.new(@@world_key, @@world_secret) })
  end


  #Upload to s3 folder @save_name
  def upload

    s3 = Aws::S3::Resource.new(region:'us-east-1')

    Dir.glob("./world/**/*").each do |fname|
      if(File.file? fname) 
        short_name = fname.gsub("./world/","")
        log("Trying to upload #{fname} to #{@save_name}/#{short_name}")
        obj = s3.bucket("thoughtstemminecraftworlds").object(@save_name +"/"+short_name)
        obj.upload_file(fname)
      end
    end

    @uploaded = true
  end

  def uploaded
    return @uploaded
  end


  def download(primary_download, secondary_download)
    @save_name = primary_download

    dir = "./world" 

    to_download = decide_on_download(primary_download, secondary_download)

    get_files(to_download, dir)
  end


  #See if the primary exists on s3.  If not we'll download from secondary location (world origin bucket)
  def decide_on_download(primary_download, secondary_download)
    s3 = connection
    keys = s3.list_objects(bucket: 'thoughtstemminecraftworlds', prefix: primary_download).contents.collect(&:key)


    log "Found keys #{keys} when checking to see if #{primary_download} extists"

    return primary_download if(keys.length > 0)

    return secondary_download
  end

  def connection
    Aws::S3::Client.new
  end

  def download_from_zip(zip_url, dir)
	`mkdir world`
	`wget #{zip_url} -O ./world/world.zip`
	`unzip ./world/world.zip -d ./world/world_unzip/`


	files = Dir.glob("./world/world_unzip/**/level.dat")

	top_most_world_dir = files.sort{|a,b| a.length <=> b.length}[0].gsub("/level.dat","")

	FileUtils.cp_r "#{top_most_world_dir}/.", "world"
	`rm -r ./world/players`
  end

  def get_files(prefix, dir)
    if(prefix.match(".zip"))
      download_from_zip(prefix, dir)
      return
    end

    s3 = connection

    keys = s3.list_objects(bucket: 'thoughtstemminecraftworlds', prefix: prefix+"/").contents.collect(&:key)

    keys.each do |key|
      log "Looking at key #{key}"
      file_name = "#{dir}#{key.to_s.gsub(prefix,"")}"

      log "Trying to save file #{file_name}"

      parts = file_name.split("/")
      sub_dir = parts.take(parts.length-1).join("/")

      if(parts.length > 1) 
	log "Made sub dir #{sub_dir}"
	FileUtils.mkdir_p(sub_dir)
      end

      File.open(file_name, "wb") do |file|
        resp = s3.get_object({ bucket:'thoughtstemminecraftworlds', key: key }, target: file)
      end
    end

    `rm -r ./world/players`

    log "Files downloaded to dir"
  end
end


class JavaController
  require 'open3'

  def initialize
    @next = nil

    clear_logs

    Thread.new{
      Open3.popen3("java -jar spigot.jar") do | input, output, error, wait_thr |
        input.sync = true
        output.sync = true
     
        loop do
          if @next
	    input.puts @next 
            @next = nil 
          else
	    sleep(0.1)
	  end
        end
      end
    }
  end 

  def cmd(c)
    @next = c
  end

  def crashed?
    res = `pgrep -fl java`
    res.strip.empty?
  end

  def stopped?
    logs.include?("Saving chunks for level 'world_the_end'/The End") #Last line of log after graceful shutdown
  end

  def started?
    logs.match(/Done.*For help, type/) != nil
  end

  def logs
    `grep --color=never -r "Server thread/INFO" ./logs/latest.log`
  end

  def all_logs
    `cat ./logs/latest.log`
  end

  def clear_logs
    `rm ./logs/latest.log`
  end
end


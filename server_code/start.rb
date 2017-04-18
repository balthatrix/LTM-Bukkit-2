def replace_in_file(name, find, replace)
  text = File.read(name)
  new_contents = text.gsub(find, replace)
  File.open(name, "w") {|file| file.puts new_contents }
end



if !Dir.exists? "../../server_code"
  puts "Run this from inside a Minecraft server folder or you'll delete a bunch of stuff you don't want to delete"

  exit
end

Dir["./*"].each do |name|
  if name != "./start.rb"
    puts "Removing #{name}"
    `rm -r ./#{name}`
  end
end

`cp -r ../../server_code/* .`

replace_in_file "./server.properties", /server-port=\d*/, "server-port=#{ARGV[0]}"
replace_in_file "./plugins/AllocationClient/config.yml", /server_id: .*/, "server_id: #{ARGV[1]}"
replace_in_file "./plugins/AllocationClient/config.yml", /server_secret: .*/, "server_secret: #{ARGV[2]}"
replace_in_file "./plugins/ThoughtStem/config.yml", /server_id: .*/, "server_id: #{ARGV[1]}" 
replace_in_file "./plugins/ThoughtStem/config.yml", /server_secret: .*/, "server_secret: #{ARGV[2]}"
replace_in_file "./plugins/LilyPad-Connect/config.yml", /username: .*/, "username: instance#{ARGV[1]}"


job1 = fork do
  exec "java -server -Xmx1G -XX:PermSize=128M -XX:MaxPermSize=256M -jar spigot.jar --log-limit 2000 --noconsole"
end

Process.detach(job1)

File.open("my.pid", "w") do |f|
  f.write job1
end

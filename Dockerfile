FROM ubuntu

EXPOSE 25565 
EXPOSE 4567  
EXPOSE 8123  

RUN apt-get update && apt-get install -y openjdk-8-jre
RUN apt-get install -y vim
RUN apt-get install -y ruby
RUN apt-get install -y wget
RUN gem install sinatra
RUN gem install foreman
RUN gem install aws-sdk

#ADD ./server_code /root/server

WORKDIR "/root/server"

ENTRYPOINT /usr/local/bin/foreman start

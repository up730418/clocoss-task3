#Install Node
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs

#Allow conections on 8080
sudo iptables -A INPUT -i eth0 -p tcp --dport 8080 -j ACCEPT

npm install

# sdab - Selfhosted Docker Automated Builds
![Not Production Ready](https://img.shields.io/badge/Production%20Ready%3F-No-red.svg)
<br>
*sdab* is a system to automatically build Dockerfiles that are in Github repos.
## Getting Started (est. 5-10min)
You need to be connected to the Docker Hub and have Docker installed on your computer. <br><br>
Now, run the following in a Terminal: 
```
docker run -p 3000:3000 \
 -v $HOME/.ssh:/root/.ssh \
 -v /var/run/docker.sock:/var/run/docker.sock \
 -v $HOME/.docker/config.json:/root/.docker/config.json \
  ronthecookie/sdab
```
It will now listen on port `3000`.

So far I have only tested this on Linux, if you have tested this on another OS and it works fine, please do open a Issue informing me of this.

## Deploying
Deploying this is not very different then running it on your Computer, if at all.
### Requirements
* A Server running Linux with:
    * Docker
    * A SSH Keypair
    * Access to a Registry like Docker Hub or your own.
<hr>

```
docker run -p 6000:3000 \
-v /path/to/ssh/keypair/folder:/root/.ssh \
-v /var/run/docker.sock:/var/run/docker.sock \
-v /PATHTO/YOURHOMEDIR/.docker/config.json:/root/.docker/config.json \
ronthecookie/sdab
```
* Change the `6000` to the external (exposed) port number you desire.
* Change `/path/to/ssh/keypair/folder` to where your SSH Key Pair is (Ex: `/home/yourname/.ssh` or `/root/.ssh`)
* Change `/PATHTO/YOURHOMEDIR` to where your home directory is (You can find this out by running `echo $HOME` in a terminal)
* Run it!

Now that your sdab instance is running, you have to go into your Github Repo's settings and select *Webhooks* -> *Add webhook* then
* Fill out the payload url with your server's URL with the path being /webhook 
![Example showing the Github interface](https://i.ronthecookie.me/wJJvUtO.png)
* Choose content type *"application/json"*<br>
![Yet another example showing the Github interface](https://i.ronthecookie.me/G0NXPpa.png)
* Enter a random string that will be your new Github Webhook secret, behave like it is your password.<br>
![Example](https://i.ronthecookie.me/ecvPjtu.png)
* Select "*Just the `push` event*" and add the Webhook - if you see a nice ✔️ emoji then success!
## "docker run" command argument customization guide
If this is a private git repo - you will need to point it to an ssh key pair with the `-v /path/to/ssh/keypair/folder:/root/.ssh`
Now, you'll need a port to expose `-p 6000:3000` where 6000 is your port.
Those are all of the important arguments done, now you just need to run `docker login` (or `docker login registry.example.com` if you are connecting to a registry other than Docker Hub)

### Docker Compose
```yaml
version: 3
services:
    sdab:
        ports:
            - '6000:3000'
        volumes:
            - '/path/to/ssh/keypair/folder:/root/.ssh'
            - '/var/run/docker.sock:/var/run/docker.sock'
            - '/pathTo/yourHomeDirectory/.docker/config.json:/root/.docker/config.json'
        image: ronthecookie/sdab
```
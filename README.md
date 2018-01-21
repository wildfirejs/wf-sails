# wf-sails-server

Host your wildfire database yourself.

> a [Sails](http://sailsjs.org) application


## Dev

If you don't have `sails` on your machine, then 

```bash
npm install sails -g
```

When `sails` is ready, run

```bash
npm install
sails lift
```

Your server will be run on `http://0.0.0.0:1337`. 

Now you can run [`wf-sails-client`](https://github.com/wildfirejs/wf-sails-client).

## How to set Admin user?

1. Sign up

2. Open './.tmp/localDiskDb.db', find your user data, and manually change the `isAdmin` field to `true`.

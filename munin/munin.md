# Install a munin plugin, as a very basic monitoring

## munin-node

* install on your docker host munin-node on mm.example.com

  ```
  apt install munin-node
  ```

* Copy mm-plugin from this directory to plugins dir as mm

  cp mm-plugin /usr/share/munin/plugins/mm

  ```
  sudo ln -s /usr/share/munin/plugins/mm /etc/munin/plugins/mm
  ```

Copy mm-plugin-conf from this directory to munin plugins conf dir as mm

copy mm-plugin-conf as to /etc/munin/plugin-conf.d
```
cp mm-plugin-conf /etc/munin/plugin-conf.d/mm
```

Restart munin
```
systemctl restart munin-node
```

# munin master
Install a munin master on different host if you don't have munin already.
```
apt install munin
```

On your munin master configure the new node
edit and add to /etc/munin.conf
```
[mm]
  mm.example.com
```
# Install a munin plugin, as a very basic monitoring

## munin-node

* install on your docker host munin-node on mm.example.com

  ```bash
  apt install munin-node
  ```

* Copy mm-plugin from this directory to plugins dir as mm

  cp mm-plugin /usr/share/munin/plugins/mm

  ```bash
  sudo ln -s /usr/share/munin/plugins/mm /etc/munin/plugins/mm
  ```

* Copy mm-plugin-conf from this directory to munin plugins conf dir as mm

  ```bash
  cp mm-plugin-conf /etc/munin/plugin-conf.d/mm
  ```

* Restart munin

  ```bash
  systemctl restart munin-node
  ```

## munin master

* Install a munin master on different host if you don't have munin already.

  ```bash
  apt install munin
  ```

* On your munin master configure the new node
  edit and add to /etc/munin.conf
  
  ```bash
  [mm]
    mm.example.com
  ```

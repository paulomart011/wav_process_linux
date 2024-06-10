# ws-sms-rabbit

Web Service REST hecho con NodeJS + Express + AMQLIB (RABBITMQ). Se recibe request de OCC y lo envia a una cola de RabbitMQ configurada en el mismo servidor (configurable)

## Para setupear el servicio:

Requisitos:

* NodeJS v18.19.0 o superior
* npm v10.2.3 o superior

Pasos:

1. Clonar el repositorio:
  ```
  git clone https://github.com/YoverCC/ws-sms-rabbit
  ```

2. Parado en la carpeta del proyecto `ws-sms-rabbit` ejecutar para instalar las dependencias:
  ```
  npm install
  ```

3. Para iniciar una instancia del servicio por consola, ejecutar (http://[IP_SERVIDOR]:8078/):
  ```
  node app.server.js
  ```

4. Los logs de ejecución quedan en la carpeta `logs` del proyecto.

5. Para iniciarlo como demonio usando [pm2](http://pm2.keymetrics.io/), se debe instalar primero este servicio:
  ```
  npm install pm2@latest -g
  ```

6. Iniciar el backend una vez y configurar los scripts para que inicie al bootear el SO:
  ```
  pm2 start app.server.js --name "ws-sms-rabbit" --instances 4
  pm2 startup
  pm2 save
  ```

7. Comandos utiles:
  ```
  pm2 start ws-sms-rabbit --> Inicia todas las instancias del procesos.
  pm2 stop ws-sms-rabbite --> Detiene todas las instancias del procesos.
  pm2 restart ws-sms-rabbit --> Reinicia todas las instancias del procesos.
  pm2 reload ws-sms-rabbit --> Reinicio controlado de todos los procesos (esperando que no estén en uso).
  pm2 list --> Lista los procesos configurados y su status actual.
  pm2 monit --> Monitoreo en tiempo real del CPU y memoria de cada instancia en ejecución.
  ```

8. Vista en RabbitMQ Interfaz (http://{IP_SERVIDOR}:15672/). (Usuario inconcertadm / inc0nc3rt)

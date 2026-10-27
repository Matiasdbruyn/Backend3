# ShipNow API

API REST para **ShipNow**, una plataforma de pedidos y entregas a domicilio. Gestiona **usuarios** (clientes, repartidores y administradores), **productos**, **pedidos** y **entregas** con seguimiento por código.

El proyecto está construido con una **arquitectura por capas** (Controller → Service → Repository), configuración de entorno validada al arranque, un **módulo de mocking** para generar datos de prueba, **manejo de errores centralizado**, **logging con Winston**, **documentación con Swagger** y **tests funcionales** con Mocha, Chai y Supertest.

| Entrega | Contenido | Estado |
| --- | --- | --- |
| Pre-entrega 1 | Arquitectura por capas, configuración de entorno validada, constantes | ✅ |
| Pre-entrega 2 | Módulo de mocks (`/api/mocks`) y carga de datos de prueba | ✅ |
| Pre-entrega 3 | Errores personalizados, diccionario de errores y middleware global | ✅ |
| Pre-entrega 4 | Logging con Winston: niveles, archivos con rotación, endpoint de prueba | ✅ |
| Pre-entrega 5 | Documentación con Swagger en `/api/docs` | ✅ |
| Pre-entrega 6 | Tests funcionales con Mocha, Chai y Supertest (`npm test`) | ✅ |
| Entrega final | Carga de archivos (Multer), health check, Docker | ⏳ |

---

## Índice

1. [Tecnologías](#tecnologías)
2. [Instalación y ejecución local](#instalación-y-ejecución-local)
3. [Variables de entorno](#variables-de-entorno)
4. [Estructura del proyecto](#estructura-del-proyecto)
5. [Arquitectura por capas](#arquitectura-por-capas)
6. [Constantes del dominio](#constantes-del-dominio)
7. [Formato de las respuestas](#formato-de-las-respuestas)
8. [Endpoints](#endpoints)
9. [Módulo de mocks (pre-entrega 2)](#módulo-de-mocks-pre-entrega-2)
10. [Manejo de errores (pre-entrega 3)](#manejo-de-errores-pre-entrega-3)
11. [Logging con Winston (pre-entrega 4)](#logging-con-winston-pre-entrega-4)
12. [Documentación con Swagger (pre-entrega 5)](#documentación-con-swagger-pre-entrega-5)
13. [Testing (pre-entrega 6)](#testing-pre-entrega-6)

---

## Tecnologías

- **Node.js** (≥ 20) con ES Modules
- **Express 5**: reenvía automáticamente al middleware de errores cualquier excepción de un handler `async`
- **MongoDB** + **Mongoose 9**
- **dotenv**: carga de variables de entorno
- **Zod 4**: validación de datos de entrada (mensajes en español)
- **@faker-js/faker**: generación de datos simulados
- **bcryptjs**: hash de contraseñas
- **Winston** + **winston-daily-rotate-file**: logging con niveles y archivos rotados por día
- **swagger-ui-express**: documentación interactiva (OpenAPI 3)
- **Mocha**, **Chai**, **Supertest** y **mongodb-memory-server**: tests funcionales

## Instalación y ejecución local

Requisitos: Node.js 20 o superior y una instancia de MongoDB (local o Atlas).

```bash
git clone <URL_DEL_REPOSITORIO>
cd shipnow-api
npm install
```

Crear el archivo `.env` a partir del ejemplo y completar los valores:

```bash
cp .env.example .env
```

> En PowerShell: `Copy-Item .env.example .env`

Levantar la API:

```bash
npm run dev     # desarrollo (se reinicia al guardar cambios)
npm start       # modo normal
npm test        # suite de tests (no necesita MongoDB instalado, ver "Testing")
```

Si todo está bien, la consola muestra:

```
2026-10-27 11:26:04 [info]    Conexión a MongoDB establecida (127.0.0.1/shipnow)
2026-10-27 11:26:04 [info]    Servidor ShipNow escuchando en el puerto 8080 (entorno: development)
```

Con el servidor levantado, la documentación interactiva queda en **http://localhost:8080/api/docs**.

Para tener datos con los que probar, lo más rápido es cargar un set completo de prueba:

```bash
curl -X POST http://localhost:8080/api/mocks/generateData
```

> **Tip para Windows:** en PowerShell usá `curl.exe` (no `curl`) o probá los endpoints con Postman / Thunder Client. Los ejemplos de este README están escritos para Git Bash o cualquier terminal Unix.

## Variables de entorno

Todas las variables se leen en un único archivo: [`src/config/env.config.js`](src/config/env.config.js). Ningún otro archivo usa `process.env`.

| Variable | Obligatoria | Descripción | Ejemplo |
| --- | --- | --- | --- |
| `PORT` | Sí | Puerto HTTP (entero entre 1 y 65535) | `8080` |
| `MONGODB_URI` | Sí | URI de conexión (`mongodb://` o `mongodb+srv://`) | `mongodb://127.0.0.1:27017/shipnow` |
| `NODE_ENV` | Sí | `development`, `production` o `test` | `development` |
| `LOG_LEVEL` | No | Nivel mínimo de log. Por defecto: `debug` en development, `info` en production y test | `info` |
| `LOG_DIR` | No | Carpeta de los archivos de log (por defecto `logs`) | `logs` |

### Validación al arranque (fail fast)

La configuración se valida **antes** de levantar el servidor. Si falta una variable crítica o tiene un valor inválido, la app registra un error **fatal** (en consola y en `logs/error-AAAA-MM-DD.log`) y **no arranca** (código de salida 1). Por ejemplo, si se borra `MONGODB_URI` del `.env`:

```
2026-10-27 11:29:41 [fatal]   Configuración inválida, la API no puede arrancar. Faltan variables de entorno obligatorias: MONGODB_URI.
  Copiá el archivo .env.example como .env y completá los valores.
```

Y si los valores existen pero son inválidos:

```
2026-10-27 11:29:41 [fatal]   Configuración inválida, la API no puede arrancar. Variables de entorno inválidas:
  - PORT debe ser un número entero entre 1 y 65535 (recibido: "abc")
  - MONGODB_URI debe comenzar con "mongodb://" o "mongodb+srv://"
  - NODE_ENV debe ser uno de: development, production, test (recibido: "prod")
```

El archivo `.env` está en `.gitignore`. En el repositorio se versionan solo `.env.example` (plantilla) y `.env.test` (entorno de testing, sin secretos).

## Estructura del proyecto

```
src/
├── app.js                  # Configuración de Express (sin listen: los tests la importan directo)
├── server.js               # Punto de entrada: conecta a MongoDB y levanta el servidor
├── config/
│   ├── env.config.js       # dotenv + validación de variables (único acceso a process.env)
│   ├── database.js         # Conexión / desconexión de MongoDB
│   ├── logger.config.js    # Configuración de Winston (niveles, formato, archivos, rotación)
│   ├── swagger.config.js   # Monta Swagger UI en /api/docs
│   └── index.js
├── constants/
│   └── index.js            # Roles, estados, prioridades, transiciones, niveles de log (Object.freeze)
├── routes/                 # Solo conectan path → método del controller
├── controllers/            # Entrada HTTP: leen req, llaman al service, responden
├── services/               # Lógica de negocio y reglas del dominio
├── repositories/           # Único lugar que consulta MongoDB (vía modelos de Mongoose)
├── models/                 # Esquemas de Mongoose (sin lógica)
├── validators/             # Schemas de Zod para validar body y query params
├── mocks/
│   └── generators.js       # Generadores de datos simulados con Faker
├── docs/                   # Especificación OpenAPI (separada de las rutas)
│   ├── openapi.js          # Info general, servidor, tags
│   ├── components/         # Schemas, respuestas y parámetros reutilizables
│   └── paths/              # Un archivo por módulo (users, products, orders, ...)
├── errors/
│   ├── errorDictionary.js  # Diccionario de errores (código, status HTTP, mensaje)
│   ├── AppError.js         # Error base
│   └── customErrors.js     # Errores personalizados del dominio
├── middlewares/
│   ├── requestLogger.middleware.js  # Log http de cada request
│   ├── notFound.middleware.js
│   └── errorHandler.middleware.js   # Middleware global de errores (+ log)
└── utils/                  # Logger de la app, respuesta exitosa, paginación, validación de ids
tests/                      # Tests funcionales (un archivo por recurso) + helpers
logs/                       # Archivos de log generados (ignorados por Git)
```

## Arquitectura por capas

```
Request ──► Router ──► Controller ──► Service ──► Repository ──► Model ──► MongoDB
                           │              │
                           │              └─ lanza errores del dominio (AppError)
                           ▼
                   sendSuccess(res)        errorHandler (middleware global) ◄── cualquier error
```

| Capa | Responsabilidad | Lo que **no** hace |
| --- | --- | --- |
| **Router** | Asocia cada path/método HTTP con una función del controller | No tiene lógica ni accede a datos |
| **Controller** | Única puerta de entrada HTTP: toma `req.params`, `req.query`, `req.body`, llama al service y elige el status code | No conoce Mongoose ni arma respuestas de error |
| **Service** | Valida los datos de entrada y aplica las reglas de negocio | No ejecuta queries directamente |
| **Repository** | Encapsula el acceso a MongoDB: filtros, proyecciones, `populate`, paginación, operaciones atómicas | No decide reglas de negocio |
| **Model** | Define el esquema de cada colección | No contiene lógica de controladores |

Los services reciben sus repositories por constructor (inyección de dependencias), lo que permite reemplazarlos por versiones falsas al testear.

### ¿Por qué separar la lógica entre Service y Repository?

La regla que seguimos es: **el Repository sabe _cómo_ obtener y guardar los datos; el Service decide _qué_ hay que hacer con ellos.**

**Ejemplos de lo que quedó en los repositories** (acceso a datos, sin ser un simple "pasamanos" de `model.find()`):

- `UserRepository` aplica una **proyección por defecto** que excluye `password`: la contraseña nunca sale de la capa de datos.
- `ProductRepository.findAll` traduce filtros simples (`category`, `minPrice`, `maxPrice`) a una query de MongoDB (regex sin distinguir mayúsculas, rangos `$gte`/`$lte`).
- `ProductRepository.decrementStock` descuenta stock de forma **atómica** (solo si `stock >= cantidad`), evitando ventas por encima del stock con pedidos simultáneos.
- `OrderRepository` hace `populate` del cliente trayendo **solo** nombre y email; `updateStatus` actualiza únicamente si el pedido sigue en el estado esperado.
- `DeliveryRepository` excluye el historial de estados en los listados (respuestas más livianas) y usa una **proyección pública** para el tracking (sin datos sensibles del repartidor ni la dirección completa).
- Todos los listados usan paginación (`skip`/`limit` + `countDocuments` en paralelo).

**Ejemplos de lo que quedó en los services** (reglas de negocio):

- El **estado de un producto** se calcula a partir del stock (`available` / `out_of_stock`); el cliente no puede enviarlo.
- El catálogo (`GET /api/products`) **oculta los productos sin stock** por defecto.
- Solo los usuarios con rol `user` (clientes) pueden generar pedidos; solo un `courier` puede repartir; todo repartidor necesita un tipo de vehículo.
- El **cálculo de totales**: subtotal por ítem, costo de envío según prioridad y total.
- La **reserva de stock** al crear un pedido y su devolución si se cancela (todo o nada).
- Las **máquinas de estado** de pedidos y entregas (qué transiciones están permitidas) y la sincronización entre ambos: cuando la entrega sale (`in_transit`) el pedido pasa a `shipped`; cuando se entrega, a `delivered`.

Gracias a esta separación, si mañana cambiáramos MongoDB por otra base de datos solo habría que reescribir los repositories: las reglas del negocio no se tocan.

## Constantes del dominio

Todos los valores fijos del dominio están en [`src/constants/index.js`](src/constants/index.js) como objetos congelados con `Object.freeze`. Los modelos, validadores, services y mocks los referencian desde ahí: no hay strings sueltos como `'admin'` o `'pending'` en el código.

| Constante | Valores |
| --- | --- |
| `USER_ROLES` | `ADMIN: 'admin'`, `USER: 'user'` (cliente), `COURIER: 'courier'` (repartidor) |
| `VEHICLE_TYPES` | `bicycle`, `motorcycle`, `car`, `van` |
| `PRODUCT_STATUS` | `AVAILABLE: 'available'`, `OUT_OF_STOCK: 'out_of_stock'` |
| `ORDER_STATUS` | `pending`, `confirmed`, `shipped`, `delivered`, `cancelled` |
| `ORDER_PRIORITY` | `low`, `normal`, `high`, `urgent` |
| `DELIVERY_STATUS` | `pending`, `assigned`, `in_transit`, `delivered`, `failed`, `cancelled` |
| `ORDER_STATUS_TRANSITIONS` / `DELIVERY_STATUS_TRANSITIONS` | Transiciones de estado permitidas |
| `SHIPPING_COST_BY_PRIORITY` | Costo de envío según prioridad |
| `DELIVERY_HOURS_BY_PRIORITY` | Horas estimadas de entrega según prioridad |
| `PAGINATION`, `MOCKS`, `HTTP_STATUS`, ... | Límites y valores técnicos |

## Formato de las respuestas

**Respuesta exitosa** (siempre la misma estructura):

```json
{
  "status": "success",
  "message": "Usuario creado",
  "payload": { "...": "..." }
}
```

Los listados agregan la paginación (`?page=1&limit=10`, máximo `limit=100`):

```json
{
  "status": "success",
  "payload": [ "..." ],
  "pagination": { "total": 42, "page": 1, "limit": 10, "totalPages": 5, "hasPrevPage": false, "hasNextPage": true }
}
```

**Respuesta de error**: ver [Manejo de errores](#manejo-de-errores-pre-entrega-3).

## Endpoints

Base URL: `http://localhost:8080/api`

### Usuarios — `/api/users`

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/users` | Lista usuarios. Filtros: `role`, `page`, `limit` |
| GET | `/api/users/:id` | Obtiene un usuario |
| POST | `/api/users` | Crea un usuario |
| PUT | `/api/users/:id` | Actualiza uno o más campos |
| DELETE | `/api/users/:id` | Elimina un usuario |

```json
// POST /api/users
{
  "firstName": "Luis",
  "lastName": "Gómez",
  "email": "luis@mail.com",
  "password": "secreto123",
  "role": "courier",
  "vehicleType": "motorcycle",
  "phone": "11 5555-5555"
}
```

`role` es opcional (por defecto `user`). `vehicleType` es obligatorio para los repartidores y no se permite para los demás roles. La contraseña se guarda hasheada y nunca se devuelve.

### Productos — `/api/products`

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/products` | Catálogo. Por defecto **solo productos con stock**. Filtros: `status`, `category`, `minPrice`, `maxPrice`, `includeOutOfStock=true`, `page`, `limit` |
| GET | `/api/products/:id` | Obtiene un producto |
| POST | `/api/products` | Crea un producto (`status` se calcula según el stock) |
| PUT | `/api/products/:id` | Actualiza uno o más campos |
| DELETE | `/api/products/:id` | Elimina un producto |

```json
// POST /api/products
{ "title": "Caja mediana", "code": "BOX-M", "price": 1800, "stock": 40, "category": "Embalaje", "description": "Caja de cartón 40x30x30" }
```

### Pedidos — `/api/orders`

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/orders` | Lista pedidos. Filtros: `status`, `priority`, `userId`, `page`, `limit` |
| GET | `/api/orders/:id` | Obtiene un pedido |
| POST | `/api/orders` | Crea un pedido (descuenta stock y calcula totales) |
| PUT | `/api/orders/:id` | Modifica prioridad, dirección o notas (solo pedidos `pending`) |
| PATCH | `/api/orders/:id/status` | Cambia el estado: `confirmed` o `cancelled` |
| DELETE | `/api/orders/:id` | Elimina un pedido `pending` o `cancelled` |

```json
// POST /api/orders
{
  "userId": "<id de un usuario con rol user>",
  "items": [{ "productId": "<id de producto>", "quantity": 2 }],
  "priority": "high",
  "shippingAddress": { "street": "Av. Corrientes 1234", "city": "CABA", "zipCode": "1043" },
  "notes": "Tocar timbre"
}
```

Ciclo de vida: `pending → confirmed → shipped → delivered` (o `cancelled`). Los estados `shipped` y `delivered` no se cambian a mano: los define el avance de la entrega. Al cancelar un pedido se devuelve el stock y, si tenía una entrega que todavía no salió, también se cancela.

### Entregas — `/api/deliveries`

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/deliveries` | Lista entregas. Filtros: `status`, `courierId`, `page`, `limit` |
| GET | `/api/deliveries/:id` | Obtiene una entrega con su historial de estados |
| GET | `/api/deliveries/tracking/:trackingCode` | **Seguimiento público** por código (ej. `SN-7YFCX59YXV`) |
| POST | `/api/deliveries` | Crea la entrega de un pedido `confirmed` (`courierId` y `estimatedDeliveryDate` opcionales) |
| PATCH | `/api/deliveries/:id/assign` | Asigna o reasigna un repartidor (`{ "courierId": "..." }`) |
| PATCH | `/api/deliveries/:id/status` | Cambia el estado (`{ "status": "in_transit", "note": "..." }`) |

Ciclo de vida: `pending → assigned → in_transit → delivered`, con `failed` (reintento → `assigned`) y `cancelled`. Si no se indica fecha estimada, se calcula según la prioridad del pedido.

### Mocks — `/api/mocks`

Ver [Módulo de mocks](#módulo-de-mocks-pre-entrega-2).

### Logger y documentación

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/logger/test` | Herramienta interna: genera un log de cada nivel (ver [Logging](#logging-con-winston-pre-entrega-4)) |
| GET | `/api/docs` | Swagger UI (ver [Swagger](#documentación-con-swagger-pre-entrega-5)) |
| GET | `/api/docs/openapi.json` | Especificación OpenAPI en JSON |

## Módulo de mocks (pre-entrega 2)

Permite generar usuarios, repartidores, productos, pedidos y entregas simulados **sin cargarlos a mano**. Respeta la arquitectura por capas:

```
mocks.router.js → mocks.controller.js → mocks.service.js → repositories → MongoDB
                                               │
                                               └─ mocks/generators.js (Faker)
```

- `src/mocks/generators.js`: funciones puras que arman objetos con la misma forma que los modelos, usando las **constantes del proyecto** y **las mismas reglas de negocio** que los services (estado del producto según stock, cálculo de totales, código de seguimiento, fecha estimada de entrega).
- `src/services/mocks.service.js`: valida las cantidades, arma los sets de datos y los inserta en MongoDB a través de los repositories.

### Endpoints

| Método | Ruta | Guarda en la base | Descripción |
| --- | --- | --- | --- |
| GET | `/api/mocks/users?qty=N&role=` | No | Usuarios con roles válidos (si no se indica `role`, mezcla clientes, repartidores y admins) |
| GET | `/api/mocks/couriers?qty=N` | No | Repartidores (rol `courier` con vehículo) |
| GET | `/api/mocks/products?qty=N` | No | Productos (~15% sin stock) |
| GET | `/api/mocks/orders?qty=N` | No | Pedidos con estados y prioridades válidos |
| GET | `/api/mocks/deliveries?qty=N` | No | Entregas con historial coherente |
| GET | `/api/mocks/dataset?users=&couriers=&products=&orders=` | No | Set completo **relacionado** (los `_id` coinciden entre entidades) |
| POST | `/api/mocks/seed?collection=&qty=N` | **Sí** | Inserta `qty` registros en una colección: `users` (por defecto), `couriers`, `products` u `orders` |
| POST | `/api/mocks/generateData` | **Sí** | Inserta un set completo relacionado (clientes, repartidores, productos, pedidos y entregas) |

- `qty` es opcional (por defecto **10**) y debe ser un entero entre **1 y 100**.
- En `dataset` y `generateData` cada cantidad acepta `0` y por defecto se usan: `users: 10`, `couriers: 3`, `products: 15`, `orders: 20`.
- Todos los usuarios insertados tienen la contraseña **`coder123`** (guardada hasheada con bcrypt).
- Los emails generados usan el dominio `@shipnow.test` para distinguirlos de datos reales.

### Qué datos se generan

| Entidad | Datos | Reglas que respeta |
| --- | --- | --- |
| Usuario | `firstName`, `lastName`, `email` único, `role`, `phone` | Rol tomado de `USER_ROLES` |
| Repartidor | Usuario con `role: courier` + `vehicleType` | Solo los repartidores tienen vehículo (`VEHICLE_TYPES`) |
| Producto | `title`, `description`, `code` (`SKU-XXXXXXXX`), `price`, `stock`, `category`, `status` | `status` según stock (`PRODUCT_STATUS`) |
| Pedido | `user`, `items[]`, `priority`, `status`, `shippingAddress`, `subtotal`, `shippingCost`, `total`, `notes` | Estados de `ORDER_STATUS`, prioridades de `ORDER_PRIORITY`; solo productos con stock; totales calculados con la misma regla que el service |
| Entrega | `order`, `courier`, `trackingCode`, `status`, `address`, `estimatedDeliveryDate`, `deliveredAt`, `statusHistory[]` | Estado coherente con el del pedido; historial con todos los pasos recorridos |

**Relaciones que se respetan:**

- **Pedido ↔ usuario:** cada pedido pertenece a un usuario con rol `user` (cliente).
- **Pedido ↔ productos:** cada ítem referencia un producto real del set (con título y precio de ese producto).
- **Entrega ↔ pedido:** solo tienen entrega los pedidos `confirmed`, `shipped` o `delivered` (uno a uno), con la dirección del pedido.
- **Entrega ↔ repartidor:** las entregas `assigned`, `in_transit`, `failed` y `delivered` tienen un usuario con rol `courier`; las `pending` no tienen repartidor. Un pedido `shipped`/`delivered` solo se genera si hay repartidores.

### Ejemplos

Datos simulados **sin guardar**:

```bash
curl "http://localhost:8080/api/mocks/users?qty=2"
```

```json
{
  "status": "success",
  "payload": [
    {
      "_id": "e1cc4ddbf758b462a1fdb86a",
      "firstName": "Natalia",
      "lastName": "Rosario Venegas",
      "email": "natalia.rosariovenegas.t5jzkj@shipnow.test",
      "role": "user",
      "phone": "975 575 017"
    },
    {
      "_id": "6796de52a27dcc4f6eb1eac1",
      "firstName": "Julia",
      "lastName": "Fajardo Palacios",
      "email": "julia.fajardopalacios.qeu7xv@shipnow.test",
      "role": "courier",
      "phone": "991 164 017",
      "vehicleType": "bicycle"
    }
  ]
}
```

Set relacionado sin guardar (sirve para ver cómo se vinculan los `_id`):

```bash
curl "http://localhost:8080/api/mocks/dataset?users=2&couriers=1&products=3&orders=4"
```

**Carga de datos de prueba** en MongoDB, por colección:

```bash
curl -X POST "http://localhost:8080/api/mocks/seed?qty=10"
```

```json
{
  "status": "success",
  "message": "Se insertaron 10 registros de prueba en \"users\"",
  "payload": { "inserted": 10, "collection": "users" }
}
```

```bash
curl -X POST "http://localhost:8080/api/mocks/seed?collection=couriers&qty=3"
curl -X POST "http://localhost:8080/api/mocks/seed?collection=products&qty=20"
curl -X POST "http://localhost:8080/api/mocks/seed?collection=orders&qty=10"
```

Los pedidos se generan sobre los clientes, productos con stock y repartidores **que ya existen en la base**, y se crean también sus entregas (`relatedDeliveries` en la respuesta). Si todavía no hay clientes o productos, la API responde con `MOCK_DEPENDENCY_MISSING`.

**Set completo en un solo paso:**

```bash
curl -X POST http://localhost:8080/api/mocks/generateData \
  -H "Content-Type: application/json" \
  -d '{ "users": 5, "couriers": 2, "products": 8, "orders": 12 }'
```

```json
{
  "status": "success",
  "message": "Datos de prueba insertados correctamente",
  "payload": {
    "inserted": { "users": 5, "couriers": 2, "products": 8, "orders": 12, "deliveries": 7 },
    "defaultPassword": "coder123"
  }
}
```

La inserción respeta el orden de las relaciones (usuarios → productos → pedidos → entregas). Si algo falla a mitad de camino, se **borra lo que se alcanzó a insertar** para no dejar datos incompletos y se responde con `MOCK_SEED_FAILED`.

## Manejo de errores (pre-entrega 3)

### Cómo funciona

1. Los errores se **detectan en la capa que corresponde**, principalmente en los services (validaciones, reglas de negocio, recursos inexistentes), y se lanzan como errores personalizados (`throw new UserNotFoundError({ id })`).
2. Los controllers **no tienen `try/catch` ni responden errores**: Express 5 deriva automáticamente al middleware de errores cualquier excepción de un handler `async`.
3. El middleware global [`errorHandler`](src/middlewares/errorHandler.middleware.js) es el **único lugar** que arma respuestas de error. También traduce errores de librerías (JSON mal formado, `CastError`, clave duplicada `11000`, caída de MongoDB) y cualquier error inesperado (500 genérico, sin exponer detalles internos).
4. Las rutas inexistentes pasan por `notFound.middleware.js`, que deriva un `RouteNotFoundError` al mismo middleware.

```
service: throw new OrderNotFoundError({ id })
   └─► Express 5 ─► errorHandler ─► normalizeError() ─► res.status(404).json({...})
```

### Estructura de la respuesta de error

Todas las respuestas de error tienen la misma forma:

```json
{
  "status": "error",
  "statusCode": 404,
  "code": "USER_NOT_FOUND",
  "message": "El usuario solicitado no existe",
  "details": { "id": "665f1f77bcf86cd799439011" },
  "path": "/api/users/665f1f77bcf86cd799439011",
  "method": "GET",
  "timestamp": "2026-10-01T16:07:17.819Z"
}
```

| Campo | Descripción |
| --- | --- |
| `status` | Siempre `"error"` |
| `statusCode` | Mismo código que el status HTTP de la respuesta |
| `code` | Código interno estable, pensado para que el cliente lo use en su lógica |
| `message` | Descripción legible en español |
| `details` | (opcional) Información extra: campos inválidos, valores recibidos, valores permitidos... |
| `path`, `method`, `timestamp` | Contexto de la petición |

En los errores de validación, `details` es una lista con un elemento por campo:

```json
{
  "status": "error",
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Los datos enviados no son válidos",
  "details": [
    { "field": "email", "message": "El email no tiene un formato válido" },
    { "field": "role", "message": "El rol debe ser uno de: admin, user, courier" }
  ],
  "path": "/api/users",
  "method": "POST",
  "timestamp": "2026-10-01T16:07:17.795Z"
}
```

### Diccionario de errores

Definido en [`src/errors/errorDictionary.js`](src/errors/errorDictionary.js). Cada error personalizado de [`src/errors/customErrors.js`](src/errors/customErrors.js) extiende de `AppError` y toma su código, status y mensaje de este diccionario.

| Código | HTTP | Error personalizado | Cuándo ocurre |
| --- | --- | --- | --- |
| `VALIDATION_ERROR` | 400 | `ValidationError` | Body o query params inválidos (incluye campos no permitidos) |
| `INVALID_ID` | 400 | `InvalidIdError` | El id no tiene formato de ObjectId |
| `INVALID_JSON` | 400 | `InvalidJsonError` | El body no es un JSON válido |
| `PAYLOAD_TOO_LARGE` | 413 | `PayloadTooLargeError` | El body supera 100 kb |
| `ROUTE_NOT_FOUND` | 404 | `RouteNotFoundError` | La ruta no existe |
| `USER_NOT_FOUND` | 404 | `UserNotFoundError` | Usuario inexistente |
| `PRODUCT_NOT_FOUND` | 404 | `ProductNotFoundError` | Producto inexistente |
| `ORDER_NOT_FOUND` | 404 | `OrderNotFoundError` | Pedido inexistente |
| `DELIVERY_NOT_FOUND` | 404 | `DeliveryNotFoundError` | Entrega o código de seguimiento inexistente |
| `EMAIL_ALREADY_EXISTS` | 409 | `EmailAlreadyExistsError` | Email ya registrado |
| `PRODUCT_CODE_ALREADY_EXISTS` | 409 | `ProductCodeAlreadyExistsError` | Código de producto repetido |
| `DELIVERY_ALREADY_EXISTS` | 409 | `DeliveryAlreadyExistsError` | El pedido ya tiene entrega |
| `DUPLICATE_KEY` | 409 | `DuplicateKeyError` | Otro valor único repetido en MongoDB |
| `INVALID_ROLE` | 422 | `InvalidRoleError` | Un no-cliente intenta generar un pedido, o se asigna como repartidor a alguien que no lo es |
| `INVALID_STATUS` | 400 | `InvalidStatusError` | Estado inexistente, o que no se puede asignar a mano |
| `INVALID_STATUS_TRANSITION` | 409 | `InvalidStatusTransitionError` | Transición no permitida (ej. `delivered → pending`) |
| `INVALID_STATE` | 409 | `InvalidStateError` | Operación no permitida en el estado actual (ej. modificar un pedido ya confirmado) |
| `INSUFFICIENT_STOCK` | 409 | `InsufficientStockError` | No hay stock suficiente para el pedido |
| `INVALID_MOCK_QUANTITY` | 400 | `InvalidMockQuantityError` | Cantidad de mocks no numérica, negativa, decimal, cero o mayor al máximo |
| `INVALID_MOCK_COLLECTION` | 400 | `InvalidMockCollectionError` | Colección que no admite datos de prueba |
| `MOCK_DEPENDENCY_MISSING` | 409 | `MockDependencyError` | Se piden pedidos de prueba pero no hay clientes o productos en la base |
| `MOCK_SEED_FAILED` | 500 | `MockSeedError` | Falló la inserción de los mocks en MongoDB (se revierte lo insertado) |
| `DATABASE_ERROR` | 503 | `DatabaseError` | MongoDB no disponible |
| `INTERNAL_SERVER_ERROR` | 500 | `AppError` | Cualquier error no previsto |

### Cómo probar los casos inválidos

Con la API levantada (`npm run dev`), cada uno de estos comandos devuelve un error con la estructura de arriba:

```bash
# Ruta inexistente → 404 ROUTE_NOT_FOUND
curl http://localhost:8080/api/no-existe

# Id con formato inválido → 400 INVALID_ID
curl http://localhost:8080/api/users/123

# Usuario inexistente → 404 USER_NOT_FOUND
curl http://localhost:8080/api/users/665f1f77bcf86cd799439011

# Datos inválidos → 400 VALIDATION_ERROR (detalle por campo)
curl -X POST http://localhost:8080/api/users -H "Content-Type: application/json" \
  -d '{ "firstName": "", "email": "no-es-un-email", "password": "1", "role": "superadmin" }'

# JSON mal formado → 400 INVALID_JSON
curl -X POST http://localhost:8080/api/users -H "Content-Type: application/json" -d '{ "firstName": '

# Repartidor sin vehículo → 400 VALIDATION_ERROR
curl -X POST http://localhost:8080/api/users -H "Content-Type: application/json" \
  -d '{ "firstName": "Luis", "lastName": "Gómez", "email": "luis@mail.com", "password": "secreto123", "role": "courier" }'

# Pedido inexistente → 404 ORDER_NOT_FOUND
curl http://localhost:8080/api/orders/665f1f77bcf86cd799439011

# Estado inválido → 400 INVALID_STATUS  (reemplazar <ORDER_ID> por un pedido real)
curl -X PATCH http://localhost:8080/api/orders/<ORDER_ID>/status -H "Content-Type: application/json" \
  -d '{ "status": "volando" }'

# Código de seguimiento inexistente → 404 DELIVERY_NOT_FOUND
curl http://localhost:8080/api/deliveries/tracking/SN-XXXXXXXXXX
```

Otros casos de negocio para probar con datos reales: pedir más unidades que el stock (`INSUFFICIENT_STOCK`), crear un pedido con un usuario `courier` (`INVALID_ROLE`), confirmar un pedido ya confirmado (`INVALID_STATUS_TRANSITION`), crear una entrega para un pedido `pending` (`INVALID_STATE`) o cancelar un pedido cuya entrega está `in_transit` (`INVALID_STATE`).

**Casos inválidos del módulo de mocks:**

```bash
# Cantidad negativa → 400 INVALID_MOCK_QUANTITY ("qty" no puede ser negativo)
curl "http://localhost:8080/api/mocks/users?qty=-5"

# Cantidad no numérica → 400 INVALID_MOCK_QUANTITY
curl "http://localhost:8080/api/mocks/products?qty=abc"

# Cantidad decimal, cero o mayor al máximo (100) → 400 INVALID_MOCK_QUANTITY
curl "http://localhost:8080/api/mocks/orders?qty=2.5"
curl "http://localhost:8080/api/mocks/orders?qty=0"
curl -X POST "http://localhost:8080/api/mocks/seed?qty=1000"

# Rol inexistente → 400 VALIDATION_ERROR
curl "http://localhost:8080/api/mocks/users?role=superadmin"

# Colección no soportada → 400 INVALID_MOCK_COLLECTION
curl -X POST "http://localhost:8080/api/mocks/seed?collection=pets"

# Pedidos sin clientes ni productos en la base (base vacía) → 409 MOCK_DEPENDENCY_MISSING
curl -X POST "http://localhost:8080/api/mocks/seed?collection=orders&qty=5"

# Combinación imposible: pedidos sin productos → 400 INVALID_MOCK_QUANTITY
curl -X POST http://localhost:8080/api/mocks/generateData -H "Content-Type: application/json" \
  -d '{ "products": 0, "orders": 5 }'

# Campo desconocido en el body → 400 VALIDATION_ERROR
curl -X POST http://localhost:8080/api/mocks/generateData -H "Content-Type: application/json" \
  -d '{ "usuarios": 5 }'
```

Si MongoDB se cae durante una carga de mocks, la API revierte lo que alcanzó a insertar y responde `500 MOCK_SEED_FAILED` indicando en `details` en qué colección falló y si el rollback fue exitoso:

```json
{
  "status": "error",
  "statusCode": 500,
  "code": "MOCK_SEED_FAILED",
  "message": "Falló la inserción de los datos de prueba en MongoDB",
  "details": { "failedCollection": "orders", "rolledBack": true },
  "path": "/api/mocks/generateData",
  "method": "POST",
  "timestamp": "2026-10-01T16:20:00.000Z"
}
```

## Logging con Winston (pre-entrega 4)

La API usa **Winston** como logger centralizado en lugar de `console.log()`. La configuración está en [`src/config/logger.config.js`](src/config/logger.config.js) y la instancia que usa toda la app en [`src/utils/logger.js`](src/utils/logger.js):

```js
import { logger } from '../utils/logger.js';

logger.info('Pedido creado');
logger.warning('Pedido sin repartidor asignado');
logger.error('Falló la creación del pedido');
```

### Niveles

De más grave a menos grave (definidos en `LOG_LEVELS`, en las constantes):

| Nivel | Prioridad | Se usa para |
| --- | --- | --- |
| `fatal` | 0 | Fallas críticas: configuración inválida, MongoDB caído al arrancar, excepciones no controladas |
| `error` | 1 | Errores inesperados del servidor (respuestas 5xx), falla al crear un pedido, rollback fallido de mocks |
| `warning` | 2 | Errores esperados o de negocio (respuestas 4xx), producto sin stock, entrega sin repartidor o fallida |
| `info` | 3 | Eventos importantes: servidor iniciado, conexión a MongoDB, pedidos/entregas creados, cambios de estado, mocks generados |
| `http` | 4 | Cada request: método, ruta, status y duración |
| `debug` | 5 | Detalle interno (reserva y devolución de stock) |

Formato de cada línea (igual en consola y archivo):

```
2026-10-27 11:26:04 [info]    Servidor ShipNow escuchando en el puerto 8080 (entorno: development)
2026-10-27 11:26:04 [info]    Conexión a MongoDB establecida (127.0.0.1/shipnow)
2026-10-27 11:26:14 [warning] Pedido 6650a1b2c3d4e5f6a7b8c9d2 sin repartidor asignado (entrega SN-7YFCX59YXV)
2026-10-27 11:26:14 [warning] GET /api/mocks/users?qty=-3 → 400 INVALID_MOCK_QUANTITY: "qty" no puede ser negativo {"details":{...}}
2026-10-27 11:26:14 [http]    GET /api/mocks/users?qty=-3 400 - 1.4 ms
```

### Comportamiento según el entorno

| Entorno (`NODE_ENV`) | Nivel mínimo | Consola | Archivos |
| --- | --- | --- | --- |
| `development` | `debug` | Sí (con colores) | Sí |
| `production` | `info` | No | Sí |
| `test` | `info` | No (la salida de Mocha queda limpia) | Sí, en `logs/test/` |

El nivel mínimo se puede cambiar con la variable `LOG_LEVEL`.

### Archivos de log y rotación

Los archivos se guardan en la carpeta `logs/` (configurable con `LOG_DIR`):

| Archivo | Contenido |
| --- | --- |
| `logs/error-AAAA-MM-DD.log` | Solo `error` y `fatal` |
| `logs/combined-AAAA-MM-DD.log` | Toda la actividad desde el nivel configurado |

**Rotación** (con `winston-daily-rotate-file`): se crea un archivo nuevo por día, cada archivo puede pesar como máximo 20 MB y se conservan los últimos **14 días**; los más viejos se borran solos. Los valores están en `LOG_ROTATION` (constantes).

**Git:** la carpeta `logs/` existe en el repositorio solo con un `.gitkeep`. Los archivos que genera la app (`logs/*`, `*.log`) están en `.gitignore` y nunca se suben.

### Integración con el manejo de errores

El middleware global de errores registra cada error antes de responder (el logger complementa al manejo de errores, no lo reemplaza: la respuesta al cliente no cambia):

- Errores **4xx** (esperados, de negocio) → `warning`, con el código y los `details`.
- Errores **5xx** (inesperados) → `error`, con el stack del error original (que nunca se envía al cliente).
- Fallas al arrancar (configuración inválida, MongoDB inaccesible) y excepciones no controladas → `fatal`. La app espera a que el log se escriba en el archivo y termina con código 1.

### Endpoint de prueba del logger

`GET /api/logger/test` es una **herramienta interna**, no una funcionalidad de negocio. Genera un log de cada nivel y devuelve qué niveles están activos en el entorno actual y a qué salidas llegó cada uno:

```bash
curl http://localhost:8080/api/logger/test
```

```json
{
  "status": "success",
  "message": "Se generó un log de prueba por cada nivel",
  "payload": {
    "environment": "development",
    "activeLevel": "debug",
    "consoleEnabled": true,
    "logDir": "logs",
    "files": {
      "error": "error-AAAA-MM-DD.log (solo niveles error y fatal)",
      "combined": "combined-AAAA-MM-DD.log (desde el nivel debug)"
    },
    "levels": [
      { "level": "debug", "priority": 5, "enabled": true, "writtenTo": ["combined", "console"] },
      { "level": "http", "priority": 4, "enabled": true, "writtenTo": ["combined", "console"] },
      { "level": "info", "priority": 3, "enabled": true, "writtenTo": ["combined", "console"] },
      { "level": "warning", "priority": 2, "enabled": true, "writtenTo": ["combined", "console"] },
      { "level": "error", "priority": 1, "enabled": true, "writtenTo": ["combined", "error", "console"] },
      { "level": "fatal", "priority": 0, "enabled": true, "writtenTo": ["combined", "error", "console"] }
    ]
  }
}
```

Después de llamarlo se puede verificar que `logs/error-AAAA-MM-DD.log` tiene **solo** las líneas `[error]` y `[fatal]`, y que `logs/combined-AAAA-MM-DD.log` tiene todas. En `production`, `debug` y `http` aparecen con `"enabled": false`.

## Documentación con Swagger (pre-entrega 5)

Con el servidor levantado (`npm run dev`):

- **Swagger UI:** http://localhost:8080/api/docs
- **Especificación OpenAPI (JSON):** http://localhost:8080/api/docs/openapi.json

### Organización

La documentación está **separada de la lógica de rutas**:

- [`src/docs/openapi.js`](src/docs/openapi.js): información general (nombre, versión, descripción, propósito, servidor local) y tags.
- [`src/docs/paths/`](src/docs/paths): un archivo por módulo (`users`, `products`, `orders`, `deliveries`, `mocks`, `logger`).
- [`src/docs/components/`](src/docs/components): schemas, respuestas y parámetros reutilizables.
- [`src/config/swagger.config.js`](src/config/swagger.config.js): monta Swagger UI en `/api/docs`.

Módulos documentados (un tag por módulo): **Users**, **Products**, **Orders**, **Deliveries**, **Mocks** y **Logger**. Cada endpoint indica método, ruta, descripción, parámetros de ruta y query, body esperado, respuesta exitosa y todas las respuestas de error posibles con ejemplos.

**Schemas reutilizables:** `User`, `Product`, `Order`, `OrderItem`, `Delivery`, `DeliveryTracking`, `Address`, `SuccessResponse`, `ErrorResponse`, `Pagination`, los bodies de entrada (`UserCreate`, `OrderCreate`, `DeliveryStatusUpdate`, ...) y los de mocks (`MockUser`, `MockOrder`, `MockGenerateDataInput`, ...).

### Por qué la documentación coincide con la API real

- **Los enums salen de las constantes del proyecto** (`USER_ROLES`, `ORDER_STATUS`, `DELIVERY_STATUS`, ...): si cambia un estado, cambia también en Swagger.
- **Los ejemplos de error se generan instanciando las clases de error reales** (`new OrderNotFoundError(...)`, `new InvalidMockQuantityError(...)`): el `code`, el `statusCode` y el `message` documentados son los mismos que devuelve el middleware global.
- **Hay tests que lo verifican** (`tests/docs.test.js`): que cada ruta documentada exista en la API con el método documentado y que cada operación tenga respuesta exitosa y respuestas de error.

### Errores documentados

| Caso | Código | HTTP |
| --- | --- | --- |
| Datos inválidos / incompletos | `VALIDATION_ERROR`, `INVALID_ID`, `INVALID_JSON` | 400 |
| Recurso no encontrado | `USER_NOT_FOUND`, `ORDER_NOT_FOUND`, `DELIVERY_NOT_FOUND`, `PRODUCT_NOT_FOUND` | 404 |
| Estado inválido en pedidos/entregas | `INVALID_STATUS` (400), `INVALID_STATUS_TRANSITION`, `INVALID_STATE` (409) | 400 / 409 |
| Cantidad inválida en mocks | `INVALID_MOCK_QUANTITY` | 400 |
| Conflictos y reglas de negocio | `EMAIL_ALREADY_EXISTS`, `INSUFFICIENT_STOCK`, `DELIVERY_ALREADY_EXISTS`, `INVALID_ROLE`, ... | 409 / 422 |
| Error interno / base de datos | `INTERNAL_SERVER_ERROR`, `MOCK_SEED_FAILED` / `DATABASE_ERROR` | 500 / 503 |

**Autenticación:** esta versión de la API no tiene autenticación, por eso no hay errores 401/403 documentados.

### Aclaraciones para probar desde Swagger

1. Abrir un endpoint, tocar **Try it out**, completar parámetros/body y **Execute**.
2. Para tener datos, ejecutar primero `POST /api/mocks/generateData` (tag **Mocks**) y copiar ids desde `GET /api/users`, `GET /api/orders`, etc.
3. Flujo completo de un envío: `POST /api/orders` → `PATCH /api/orders/{id}/status` con `confirmed` → `POST /api/deliveries` → `PATCH /api/deliveries/{id}/assign` → `PATCH /api/deliveries/{id}/status` (`in_transit`, `delivered`) → `GET /api/deliveries/tracking/{trackingCode}`.

## Testing (pre-entrega 6)

### Herramientas

| Herramienta | Para qué se usa |
| --- | --- |
| **Mocha** | Organiza y ejecuta los tests (`describe` / `it`, hooks `beforeAll`, `beforeEach`, `afterAll`) |
| **Chai** | Aserciones (`expect`) sobre status, headers y estructura del body |
| **Supertest** | Hace las peticiones HTTP contra la app de Express **sin levantar un puerto** (importa `src/app.js`, que está separado de `src/server.js`) |
| **mongodb-memory-server** | Base de datos MongoDB en memoria, exclusiva para los tests |

### Cómo ejecutarlos

```bash
npm install
npm test
```

No hace falta levantar el servidor ni tener MongoDB instalado. La configuración de Mocha está en `.mocharc.json`.

### Entorno de testing separado

- **Variables propias:** `npm test` carga `.env.test` (no `.env`). Ese archivo se versiona porque no tiene secretos:

  | Variable | Valor en test |
  | --- | --- |
  | `NODE_ENV` | `test` |
  | `PORT` | `8081` (obligatoria por la validación; los tests no abren el puerto) |
  | `MONGODB_URI` | Vacía → base en memoria (ver abajo) |
  | `LOG_LEVEL` / `LOG_DIR` | `info` / `logs/test` (sin consola, para que la salida de Mocha quede limpia) |

- **Base de datos separada:** si `MONGODB_URI` está vacía, `tests/setup.js` levanta un **MongoDB en memoria** (`shipnow_test`) que se crea al empezar y se destruye al terminar. No se requiere ninguna base de testing. La primera vez que se corre `npm install`, `mongodb-memory-server` descarga el binario de MongoDB.
- **Opcional:** para correr contra un MongoDB real, completar `MONGODB_URI` en `.env.test` con una base **distinta** a la de desarrollo, por ejemplo `mongodb://127.0.0.1:27017/shipnow_test`. Por seguridad, los tests **se niegan a correr** si el nombre de la base no contiene `test`.

### Datos de prueba y limpieza

- **Datos controlados:** cada test crea sus propios datos a través de la API, usando los generadores de mocks como base (`tests/helpers/fixtures.js`). Ejemplo: para probar un pedido, primero se crea un cliente y un producto válidos. No se usan datos cargados a mano.
- **Limpieza:** un hook global `beforeEach` (en `tests/setup.js`) **vacía todas las colecciones antes de cada test**, y `afterAll` limpia, cierra la conexión y apaga la base en memoria. Ningún test depende del estado previo de la base ni del orden de ejecución, y la suite pasa siempre, aunque se corra varias veces seguidas.

### Qué valida cada test

No alcanza con que el endpoint "responda": cada test verifica el **status HTTP**, el **formato** de la respuesta y sus **propiedades importantes**. Los helpers de `tests/helpers/assertions.js` validan la estructura completa:

- éxito: `{ status: 'success', payload, pagination? }`
- error: `{ status: 'error', statusCode, code, message, path, method, timestamp }`, con el `code` del diccionario de errores y sin exponer el stack

### Módulos cubiertos

| Archivo | Qué cubre |
| --- | --- |
| `tests/users.test.js` | Listado (paginación, filtro por rol, sin contraseña), alta, consulta, actualización y baja; errores 400 (datos incompletos, campo no permitido, repartidor sin vehículo), 404, 409 |
| `tests/products.test.js` | Estado calculado según stock, catálogo sin productos agotados, código duplicado, 404 |
| `tests/orders.test.js` | **Flujo principal:** crear pedido (totales, descuento de stock), listar, consultar por id, modificar, cambiar estado (confirmar, cancelar con devolución de stock), eliminar; errores de datos incompletos, JSON inválido, 404, stock insuficiente, rol inválido, estado inválido y transición inválida |
| `tests/deliveries.test.js` | Crear entrega, asignar repartidor, `in_transit` → `delivered` sincronizando el pedido, tracking público; errores de estado, transición, rol y recurso inexistente |
| `tests/mocks.test.js` | Generación sin guardar (users, couriers, products, orders, deliveries, dataset con relaciones), cantidades inválidas (negativa, cero, no numérica, decimal, mayor al máximo), `seed` y `generateData` con verificación en la base |
| `tests/logger.test.js` | Endpoint de prueba del logger (niveles activos en test y salidas) y método no soportado |
| `tests/docs.test.js` | Swagger UI, `openapi.json` (tags y schemas), coherencia entre la documentación y las rutas reales |
| `tests/errors.test.js` | Ruta inexistente (404), JSON inválido (400), body demasiado grande (413) |

Resultado actual: **100 tests pasando**.

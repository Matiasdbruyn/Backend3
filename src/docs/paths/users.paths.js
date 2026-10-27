import { USER_ROLES } from '../../constants/index.js';
import {
  EmailAlreadyExistsError,
  InvalidIdError,
  InvalidJsonError,
  UserNotFoundError,
  ValidationError,
} from '../../errors/index.js';
import { idParam, paramRef, queryEnum } from '../components/parameters.js';
import {
  commonErrors,
  errorExample,
  errorResponse,
  jsonBody,
  successResponse,
} from '../components/responses.js';

const ID = '6650a1b2c3d4e5f6a7b8c9d0';
const BASE = '/api/users';

const invalidId = (method) => errorExample(new InvalidIdError('123'), { path: `${BASE}/123`, method });
const notFound = (method) =>
  errorResponse('El usuario no existe', [
    errorExample(new UserNotFoundError({ id: ID }), { path: `${BASE}/${ID}`, method }),
  ]);
const emailTaken = (method, path) =>
  errorResponse('El email ya está registrado', [
    errorExample(new EmailAlreadyExistsError('luis@mail.com'), { path, method }),
  ]);
const invalidBody = (method, path) => [
  errorExample(
    new ValidationError([
      { field: 'email', message: 'El email no tiene un formato válido' },
      { field: 'vehicleType', message: 'Los repartidores (courier) deben indicar el tipo de vehículo' },
    ]),
    { path, method },
  ),
  errorExample(new InvalidJsonError(), { path, method }),
];

export const usersPaths = {
  [BASE]: {
    get: {
      tags: ['Users'],
      summary: 'Listar usuarios',
      description: 'Devuelve los usuarios paginados (sin contraseña). Se puede filtrar por rol.',
      parameters: [
        queryEnum('role', Object.values(USER_ROLES), 'Filtra por rol'),
        paramRef('Page'),
        paramRef('Limit'),
      ],
      responses: {
        200: successResponse('Listado de usuarios', 'User', { list: true }),
        400: errorResponse('Query params inválidos', [
          errorExample(
            new ValidationError([{ field: 'role', message: 'El rol debe ser uno de: admin, user, courier' }]),
            { path: `${BASE}?role=superadmin` },
          ),
        ]),
        ...commonErrors,
      },
    },
    post: {
      tags: ['Users'],
      summary: 'Crear usuario',
      description:
        'Crea un usuario. `role` es opcional (por defecto `user`). Los repartidores (`courier`) deben indicar `vehicleType` y el resto de los roles no puede tenerlo. La contraseña se guarda hasheada.',
      requestBody: jsonBody('UserCreate'),
      responses: {
        201: successResponse('Usuario creado', 'User'),
        400: errorResponse('Datos inválidos', invalidBody('POST', BASE)),
        409: emailTaken('POST', BASE),
        ...commonErrors,
      },
    },
  },
  [`${BASE}/{id}`]: {
    get: {
      tags: ['Users'],
      summary: 'Obtener un usuario',
      parameters: [idParam('del usuario')],
      responses: {
        200: successResponse('Usuario encontrado', 'User'),
        400: errorResponse('Id con formato inválido', [invalidId('GET')]),
        404: notFound('GET'),
        ...commonErrors,
      },
    },
    put: {
      tags: ['Users'],
      summary: 'Actualizar un usuario',
      description:
        'Actualiza uno o más campos. Si el usuario deja de ser repartidor, se elimina su vehículo.',
      parameters: [idParam('del usuario')],
      requestBody: jsonBody('UserUpdate'),
      responses: {
        200: successResponse('Usuario actualizado', 'User'),
        400: errorResponse('Id o datos inválidos', [
          invalidId('PUT'),
          errorExample(
            new ValidationError([{ field: 'body', message: 'Debe enviar al menos un campo para actualizar' }]),
            { path: `${BASE}/${ID}`, method: 'PUT' },
          ),
        ]),
        404: notFound('PUT'),
        409: emailTaken('PUT', `${BASE}/${ID}`),
        ...commonErrors,
      },
    },
    delete: {
      tags: ['Users'],
      summary: 'Eliminar un usuario',
      parameters: [idParam('del usuario')],
      responses: {
        200: successResponse('Usuario eliminado (devuelve el usuario borrado)', 'User'),
        400: errorResponse('Id con formato inválido', [invalidId('DELETE')]),
        404: notFound('DELETE'),
        ...commonErrors,
      },
    },
  },
};

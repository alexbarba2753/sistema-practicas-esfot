/**
 * DTOs y Mappers para Usuario 
 */

export const toUsuarioDto = (usuario) => {
  if (!usuario) return null;
  const userObj = usuario.toObject ? usuario.toObject() : usuario;

  return {
    id: userObj._id?.toString() || userObj.id,
    cedula: userObj.cedula,
    nombres: userObj.nombres,
    apellidos: userObj.apellidos,
    correo: userObj.correo,
    rol: userObj.rol,
    telefono: userObj.telefono || '',
    estado: userObj.estado,
    createdAt: userObj.createdAt
  };
};

export const toUsuarioListDto = (usuarios = []) => {
  return usuarios.map(toUsuarioDto);
};

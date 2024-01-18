const UserRepository = require('../repositories/userRepository');
const CartRepository = require('../repositories/cartRepository');
const utils = require("../utils")

// Instanciando clases
const userRepository = new UserRepository();
const cartRepository = new CartRepository()

// Función para obtener todos los usuarios
async function getAllUsers() {
  return userRepository.getAllUsers();
}

// Función para obtener un usuario por correo electrónico
async function getUserByEmail(userEmail) {
  return userRepository.getUserByEmail(userEmail);
}

async function getUserById(userId) {
  return userRepository.getUserById(userId);
}

// Función para crear un nuevo usuario
async function createUser({ first_name, last_name, email, age, password, rol }) {
  const newUser = {
    first_name,
    last_name,
    email,
    age,
    password: utils.createHash(password),
    rol,
  };

  return userRepository.createUser(newUser);
}

// Función para actualizar un usuario
async function updateUser(userEmail, userData) {
  if (userData.email) {
    throw new Error("No se puede modificar el correo electrónico");
  }

  return userRepository.updateUser(userEmail, userData);
}

// Función para eliminar un usuario
async function deleteUser(userEmail) {
  return userRepository.deleteUser(userEmail);
}

async function updatePassword(userId, newPassword) {
  try { 
    const updatedUser = await userRepository.updatePassword(userId, newPassword);
    return updatedUser;
  } catch (error) {
    throw error;
  }
}

async function toggleUserRole(userId) {
  try {
    const updatedUser = await userRepository.toggleUserRole(userId);
    return updatedUser;
  } catch (error) {
    throw new Error(`Error al cambiar el rol del usuario en el servicio: ${error.message}`);
  }
}

async function uploadDocuments(userId, files){
  const user = await userRepository.getUserById(userId);

  if (!user) {
    throw new Error('Usuario no encontrado');
  }

  const processFiles = async (field) => {
    if (files[field]) {
      const fieldFiles = files[field].map(file => ({ name: field, path: file.path }));
      await usersMongo.updateDocuments(userId, ...fieldFiles);
      return fieldFiles;
    }
    return [];
  };

  const profiles = await processFiles('profiles');
  const products = await processFiles('products');
  const documents = await processFiles('documents');
  const identificacion = await processFiles("identificacion")
  const comprobanteDomicilio = await processFiles("comprobanteDomicilio")
  const estadoDeCuenta = await processFiles("estadoDeCuenta")
}

module.exports = {
  getAllUsers,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  updatePassword,
  toggleUserRole,
  uploadDocuments
};

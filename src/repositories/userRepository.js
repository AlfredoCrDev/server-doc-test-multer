const cartModel = require('../models/carts.model.js');
const userModel = require('../models/user.model.js');

class UserRepository {
  async getAllUsers() {
    try {
      const users = await userModel.find();
      return { result: "success", payload: users };
    } catch (error) {
      throw new Error(`Error en UserRepository.getAllUsers: ${error.message}`);
    }
  }

  async getUserByEmail(userEmail) {
    try {
      const user = await userModel.findOne({email: userEmail});
      return user || null
    } catch (error) {
      throw new Error(`Error en UserRepository.getUserByEmail: ${error.message}`);
    }
  }

  async getUserById(userId) {
    try {
      const user = await userModel.findOne({_id: userId});
      return user || null
    } catch (error) {
      throw new Error(`Error en UserRepository.getUserById: ${error.message}`);
    }
  }


  async createUser(userData) {
    try {
      const user = new userModel(userData);

      const cart = await cartModel.create({user: user._id})

      user.cart = cart._id
      await user.save();
      return user;
    } catch (error) {
      throw new Error(`Error en UserRepository.createUser: ${error.message}`);
    }
  }

  async updateUser(userEmail, userData) {
    try {
      const updatedUser = await userModel.updateOne({email: userEmail}, userData);
      return updatedUser;
    } catch (error) {
      throw new Error(`Error en UserRepository.updateUser: ${error.message}`);
    }
  }

  async deleteUser(userEmail) {
    try {
      const result = await userModel.deleteOne({email: userEmail});
      return result;
    } catch (error) {
      throw new Error(`Error en UserRepository.deleteUser: ${error.message}`);
    }
  }

  async updatePassword(userId, newPassword) {
    try {
      const updatedUser = await userModel.findByIdAndUpdate(
        userId,
        { password: newPassword },
        { new: true }
      );

      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  async toggleUserRole(userId) {
    try {
      const user = await userModel.findOne({_id: userId});
  
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
  
      // Cambiar el rol del usuario
      user.rol = user.rol === 'usuario' ? 'premium' : 'usuario';
  
      // Guardar el usuario actualizado en la base de datos
      await user.save();
  
      return user;
    } catch (error) {
      throw new Error(`Error al cambiar el rol del usuario: ${error.message}`);
    }
  }

  async updateDocuments (userId, documents) {
    try {
      const updateDocument = await userModel.findByIdAndUpdate(
        userId,
        { $push: { documents: { $each: documents } } },
        { new: true });

      if (updateDocument.documents.length >= 3 && updateDocument.rol === "usuario") {
        await userModel.findByIdAndUpdate(userId, { rol: "premium" }, { new: true });
        console.log("Rol cambiado a premium");
      }
        
      return updateDocument;
    } catch (error) {
      throw error
    }
  }

}

module.exports = UserRepository;

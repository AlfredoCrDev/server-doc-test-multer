const userService = require('../services/userService');
const utils = require("../utils")
const passport = require("passport")
const nodemailer = require("nodemailer")


class UserController {
  async getAllUsers(req, res) {
    try {
      const users = await userService.getAllUsers();
      req.logger.info("Lista de usuarios")
      res.json(users);
    } catch (error) {
      req.logger.error(`Error al obtener la lista de usuarios: ${error}`)
      res.status(500).json({ error: error.message });
    }
  }

  async loginUser(req, res) {
    try {
      passport.authenticate('login', { session: false }, (err, user, info) => {
        if (err) {
          console.error('Error en autenticación:', err);
          return res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
        }
        if (!user) {
          return res.status(401).json({ status: 'error', message: 'Credenciales incorrectas' });
        }
        const token = utils.generateToken(user);
        res.cookie('token', token, { httpOnly: true, maxAge: 60 * 60 * 1000 });
        res.json({ status: 'success', user, token });
      })(req, res);
    } catch (error) {
      req.logger.error('Error al tratar de hacer login:', error);
      res.status(500).json({ status: 'error', message: 'Se ha producido un error inesperado' });
    }
  }

  async getUserByEmail(req, res) {
    const userEmail = req.params.email;
    try {
      const user = await userService.getUserByEmail(userEmail);
      if (!user) {
        req.logger.warn("Usuario no encontrado")
        return res.status(404).json({ status: "error", message: `Usuario con email "${userEmail}" no
        encontrado`});
      }
      req.logger.info(`Información del usuario "${user.name}"`)
      res.status(200).json({status: "success", message: "Usuario encontrado con éxito"});
    } catch (error) {
      req.logger.error(`Error al buscar el usuario por su email: ${error}`);
      res.status(500).json({ error: error.message });
    }
  }

  async getUserById(req, res) {
    const userId = req.params.uid;
    try {
      const user = await userService.getUserById(userId);
      if(!user){
        req.logger.warn("El usuario solicitado no existe");
        return res.status(404).send();
        }
      req.logger.info(`Mostrando información del usuario con id "${userId}":`);
      res.json({status: "success", message: "Usuario encontrado"});
    } catch (error) {
      req.logger.error(`Ocurrió un error al obtener el usuario por su ID: ${error}`);
      res.status(500).json({ error: error.message });
    }
  }

async createUser(req, res) {
  const { first_name, last_name, email, age, password, rol } = req.body;
  try {
    const emailExists = await userService.getUserByEmail(email);
    if (emailExists) {
      req.logger.warn(`Ya hay un usuario registrado con el correo electrónico "${email}"`);
      return res.status(400).json({ status: "error", message: "El correo electrónico ya está en uso" });
    }

    // Crear el usuario si el correo electrónico no está en uso
    const user = await userService.createUser({ first_name, last_name, email, age, password, rol });    
    let token = utils.generateToken(user);
    req.logger.info(`Creó el usuario "${user.first_name} ${user.last_name}" con exito.`);
    res.status(200).json({ status: "success", token, redirect: "/" });
  } catch (error) {
    req.logger.error("Error al crear al usuario en el controlador: ", error);
    res.status(400).json({ status: "error", message: error.message });
  }
}

  async updateUser(req, res) {
    const userId = req.params.id;
    const userData = req.body;
    try {
      const updatedUser = await userService.updateUser(userId, userData);
      req.logger.info("Usuario actualizado con éxito")
      res.json(updatedUser);
    } catch (error) {
      req.logger.error(`Error al actualizar el usuario con id "${userId}": `, error);
      res.status(500).json({ error: error.message });
    }
  }

  async deleteUser(req, res) {
    const userEmail = req.params.id;
    try {
      const result = await userService.deleteUser(userEmail);
      if (!result) throw new Error('No se pudo eliminar el usuario');
      req.logger.info(`Se ha eliminado correctamente al usuario con la dirección de correo "${userEmail}"`);
      res.status(200).json({ status:"success", message: 'User deleted successfully', result });
    } catch (error) {
      req.logger.error(`Error al intentar borrar el usuario con la dirección de correo "${userEmail}".`, error);
      res.status(500).json({ error: error.message });
    }
  }

  async getUserInfo(req, res) {
    res.send({status:"success", payload:req.user})
  }

  async logoutUser(req, res) {
    res.clearCookie('token'); // No funciona buscar manera de eliminar la cookie
    res.redirect('/');
  };

  async forgotPassword (req,res) {
    const {email} = req.body;
    const user = await userService.getUserByEmail(email);
    if(!user) {
      req.logger.warn(`No existe usuario con el corre ${email}`)
      return res.status(400).json({status:'error', msg:`El correo electronico "${email}"`})
    }
    let token = utils.generateToken(user);
    const url = `http://localhost:8080/reset-password?token=${token}&email=${email}`;

    const transporter = nodemailer.createTransport({
      service: "Gmail",  
      auth: {
          user: process.env.USER, 
          pass: process.env.PASS 
      }
    });
    const mailOptions = {
      from: `"Recuperación de contraseña" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Restablecer Contraseña",
      text: `Haz clic en este enlace para restablecer tu contraseña:\n\n ${url}\n\n
      Si no has solicitado un cambio de contraseña, puedes ignorar este mensaje.\n`,
      html: `<p>Haz click en el siguiente enlace para restablecer tu contraseña:</p>
      <a href="${url}">Cambiar mi contraseña</a>`
    };

    try {
      const sendEmail = await transporter.sendMail
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            req.logger.warn("Error al enviar el email:", error);
            res.status(500).json({ error: "Error al enviar el correo" });
        } else {
            req.logger.info("Correo para restablecer contraseña ha sido enviado");
            res.status(200).json({ message: "Correo enviado con éxito", sendEmail });
        }
    });
    } catch (error) {
      req.logger.error('Error al enviar el correo:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  async updatePassword(req, res) {
    const { email, newPassword, token } = req.body;
  
    try {
      // Verificar Token
      const verifyToken = await utils.verifyToken(token)
      if (!verifyToken || verifyToken.user.email !== email) {
        req.logger.warn("Token Inválido")
        return res.status(400).json({ error: "Token inválido" });
      }
      // Validar Usuario
      const user = await userService.getUserByEmail(email);
      if (!user) {
        req.logger.warn("Usuario no encontrado")
        return res.status(400).json({ error: "No se encontró el usuario" });
      }
      const matchOldPassword = utils.isValidPassword(user, newPassword)
  
      if (matchOldPassword) {
        return res.status(400).json({ error: "La nueva contraseña no puede ser igual a la anterior" });
      }
  
      const hashedPassword = utils.createHash(newPassword);
  
      const userUpdate = await userService.updatePassword(user._id, hashedPassword);
  
      if (!userUpdate) {
        throw new Error("Error al actualizar la contraseña");
      }
      req.logger.info("Se actualizo la contraseña correctamente")
      return res.status(200).json({ message: "Contraseña actualizada correctamente" });
    } catch (error) {
      req.logger.error(`Error al buscar al usuario o actualizar la contraseña: ${error}`);
      return res.status(500).json({ error: "Error interno del servidor" });
    }
  }

  async toggleUserRole(req, res) {
    const userId = req.params.uid;
  
    try {
      const updatedUser = await userService.toggleUserRole(userId);
      res.status(200).json({ status: 'success', user: updatedUser });
    } catch (error) {
      req.logger.error('Error al cambiar el rol del usuario:', error);
      res.status(400).json({ status: 'error', message: error.message });
    }
  }

  async uploadDocuments (req, res){
    try {
      const userId = req.params.uid;
      await userService.uploadDocuments(userId, req.files);
      res.send({ status: "success", message: "Archivos Guardados" });
    } catch (error) {
      req.logger.error("Error al tratar de subir la documentacion");
      res.status(500).json({ status: 'error', error: 'Error interno del servidor' });
    }
  }
}

module.exports = UserController;

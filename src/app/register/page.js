"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import '../globals.css';

export default function Register() {
  const [usuario, setUsuario] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  // Función para registrar acción en logs
  const registrarAccion = async (usuarioId, accion, detalles = {}) => {
    try {
      await addDoc(collection(db, "logs"), {
        usuarioId,
        accion,
        detalles,
        fecha: serverTimestamp()
      });
    } catch (error) {
      console.error("Error registrando acción:", error);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // Validar contraseña mínima
    if (password.length < 8) {
      alert("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    // Validar correo institucional
    if (!email.endsWith("@upmys.edu.mx")) {
      alert("Solo se permiten correos institucionales");
      return;
    }

    try {
      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user || !user.uid) {
        alert("Error al crear la cuenta. Intenta de nuevo.");
        return;
      }

      auth.languageCode = 'es';

      // Guardar datos del usuario en Firestore
      await addDoc(collection(db, "usuarios"), {
        uid: user.uid,
        username: usuario,
        email: email,
        sesionActiva: false,
        fechaRegistro: new Date().toISOString()
      });

      // Registrar acción de registro en logs
      await registrarAccion(user.uid, "Registro de usuario", { username: usuario, email });

      // Enviar correo de verificación (intento seguro)
      try {
        await sendEmailVerification(user);
      } catch (err) {
        console.warn("No se pudo enviar el email de verificación:", err.message);
      }

      alert("Registro exitoso. Revisa tu correo para verificar la cuenta.");
      router.push("/");

    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        alert("Este correo ya está registrado. Intenta con otro correo.");
      } else {
        alert("Error al registrarse: " + error.message);
      }
    }
  };

  return (
    <div className="container-register">
      <form onSubmit={handleRegister}>
        <h2>Crear Cuenta</h2>
        <input
          type="text"
          placeholder="Usuario"
          onChange={(e) => setUsuario(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Correo electrónico"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Registrarse</button>
        <p>
          ¿Ya tienes cuenta?{" "}
          <span className="switch-link" onClick={() => router.push("/")}>
            Inicia sesión
          </span>
        </p>
      </form>
    </div>
  );
}

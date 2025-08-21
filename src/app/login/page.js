"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore";
import '../globals.css';

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const registrarAccion = async (usuarioId, accion, detalles = {}) => {
    try {
      let usuarioNombre = "Desconocido";

      if (usuarioId !== "desconocido") {
        const userRef = doc(db, "usuarios", usuarioId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          usuarioNombre = data.username || "Desconocido";
        }
      }

      await addDoc(collection(db, "logs"), {
        usuarioId,
        usuarioNombre,
        accion,
        detalles,
        fecha: serverTimestamp()
      });
    } catch (error) {
      console.error("Error registrando acción:", error);
    }
  };

  const handleLogin = async () => {
    try {
      if (usuario === "admin" && password === "12345678") {
        alert("Bienvenido Administrador");
        localStorage.setItem("rol", "admin");
        router.push("/VistaAdmin"); 
        return;
      }

      const q = query(collection(db, "usuarios"), where("username", "==", usuario));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert("Nombre de usuario no encontrado");
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const usuarioId = userDoc.id;
      const userRef = doc(db, "usuarios", usuarioId);
      const userData = userDoc.data();

      // 🔹 Verificar si ya hay una sesión activa
      if (userData.sesionActiva) {
        alert("Este usuario ya tiene una sesión activa. No se puede iniciar sesión dos veces al mismo tiempo.");
        return;
      }

      const email = userData.email;

      // 🔹 Marcar sesión como inactiva antes de iniciar (opcional)
      await updateDoc(userRef, { sesionActiva: false });

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        alert("Debes verificar tu correo antes de iniciar sesión.");
        return;
      }

      await updateDoc(userRef, {
        sesionActiva: true,
        ultimaConexion: new Date().toISOString()
      });

      // 🔹 Guardamos username en localStorage para los logs
      localStorage.setItem("username", usuario);

      await registrarAccion(usuarioId, "Inicio de sesión", { username: usuario });

      localStorage.setItem("rol", "usuario");

      alert("Login exitoso");
      router.push("/dashboard");

    } catch (err) {
      console.error(err);
      alert("Error al iniciar sesión");
    }
  };

  return (
    <>
      <div className="logo-login">
        <img
          src="https://static.wixstatic.com/media/38837b_df7d67422665440a99fd48193b02cb1d~mv2.png/v1/fill/w_280,h_168,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/38837b_df7d67422665440a99fd48193b02cb1d~mv2.png"
          alt="Logo principal"
        />
      </div>

      <div className="container">
        <h2>Inicio de Sesión</h2>

        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
          <input
            type="text"
            placeholder="Usuario"
            onChange={(e) => setUsuario(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Iniciar sesión</button>
          <p>
            ¿No tienes cuenta?{" "}
            <span
              className="switch-link"
              onClick={() => router.push("/register")}
            >
              Regístrate
            </span>
          </p>
        </form>
      </div>
    </>
  );
}

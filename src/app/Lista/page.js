"use client";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export default function Lista() {
  const [pacientes, setPacientes] = useState([]);

  useEffect(() => {
    const fetchPacientes = async () => {
      const querySnapshot = await getDocs(collection(db, "pacientes"));
      setPacientes(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchPacientes();
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "80px auto", padding: 20 }}>
      <h2>Pacientes registrados</h2>
      {pacientes.map(p => (
        <div key={p.id} style={{ border: "1px solid #ccc", marginBottom: 10, padding: 10, borderRadius: 6 }}>
          <p><b>Nombre:</b> {p.nombre}</p>
          <p><b>Edad:</b> {p.edad}</p>
          <p><b>Sexo:</b> {p.sexo}</p>
          <p><b>Patología:</b> {p.patologia}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {p.imagenes?.map((img, i) => <img key={i} src={img} width={100} style={{ borderRadius: 4 }} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

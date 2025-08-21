"use client";

import { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import { collection, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";

export default function RPaciente() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const id = searchParams.get("id") || null;
  const origen = searchParams.get("origen") || "dashboard"; // Nuevo parámetro para saber de dónde viene

  const fechaParam = searchParams.get("fecha") || "";
  const horaInicioParam = searchParams.get("horaInicio") || "";
  const horaFinParam = searchParams.get("horaFin") || "";

  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [patologia, setPatologia] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [imagenes, setImagenes] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [fecha, setFecha] = useState(fechaParam);
  const [horaInicio, setHoraInicio] = useState(horaInicioParam);
  const [horaFin, setHoraFin] = useState(horaFinParam);

  const originalDataRef = useRef({});

  const currentYear = new Date().getFullYear(); // Año actual

  // --- Helpers para conversión/validación de fecha ---
  const parseToISODate = (input) => {
    if (!input) return "";
    if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
      return input.split("T")[0];
    }
    if (/^\d{2}[\/-]\d{2}[\/-]\d{4}$/.test(input)) {
      const parts = input.includes("/") ? input.split("/") : input.split("-");
      const [d, m, y] = parts;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    const tryDate = new Date(input);
    if (!isNaN(tryDate.getTime())) {
      const yyyy = tryDate.getFullYear();
      const mm = String(tryDate.getMonth() + 1).padStart(2, "0");
      const dd = String(tryDate.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    return "";
  };

  useEffect(() => {
    if (id) {
      const fetchPaciente = async () => {
        try {
          const docRef = doc(db, "pacientes", id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setNombre(data.nombre || "");
            setEdad(data.edad || "");
            setSexo(data.sexo || "");
            setTelefono(data.telefono || "");
            setPatologia(data.patologia || "");
            setDomicilio(data.domicilio || "");
            setImagenes(data.imagenes || []);
            setPreviewUrls(data.imagenes || []);
            setFecha(parseToISODate(data.fecha) || "");
            setHoraInicio(data.horaInicio || "");
            setHoraFin(data.horaFin || "");
            originalDataRef.current = {
              nombre: data.nombre || "",
              edad: data.edad || "",
              sexo: data.sexo || "",
              telefono: data.telefono || "",
              patologia: data.patologia || "",
              domicilio: data.domicilio || "",
              imagenes: data.imagenes || [],
              fecha: parseToISODate(data.fecha) || "",
              horaInicio: data.horaInicio || "",
              horaFin: data.horaFin || "",
            };
          }
        } catch (error) {
          console.error("Error cargando paciente:", error);
        }
      };
      fetchPaciente();
    }
  }, [id]);

  const eliminarImagen = (index) => {
    setImagenes((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });

  const arraysIguales = (a, b) => {
    if (!a || !b) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  };

  const validarFecha = (fechaStr) => {
    if (!fechaStr) return false;
    const d = new Date(fechaStr + "T00:00");
    const dia = d.getDay();
    const year = d.getFullYear();
    return dia !== 0 && dia !== 6 && year === currentYear; // Solo año actual
  };
const formatToDDMMYYYY = (fechaISO) => {
  if (!fechaISO) return "";
  const [yyyy, mm, dd] = fechaISO.split("-");
  return `${dd}-${mm}-${yyyy}`;
};

  const validarHora = (hora) => {
    if (!/^\d{2}:\d{2}$/.test(hora)) return false;
    const [h, m] = hora.split(":").map(Number);
    return h >= 8 && h <= 16 && m >= 0 && m <= 59 && !(h === 16 && m > 0);
  };

  const registrarPaciente = async () => {
    if (![nombre, edad, sexo, telefono, patologia, domicilio].every(Boolean)) {
      alert("Completa todos los campos antes de guardar.");
      return;
    }

    if (id) {
      if (!fecha || !validarFecha(fecha)) {
        alert(`Fecha inválida. Solo se permiten días hábiles del año ${currentYear}`);
        return;
      }
      if (
        !horaInicio ||
        !validarHora(horaInicio) ||
        !horaFin ||
        !validarHora(horaFin) ||
        horaFin <= horaInicio
      ) {
        alert("Horario inválido (08:00 a 16:00) o hora fin menor que inicio");
        return;
      }
    }

    const originales = originalDataRef.current || {};
    const cambios =
      nombre !== originales.nombre ||
      edad !== originales.edad ||
      sexo !== originales.sexo ||
      telefono !== originales.telefono ||
      patologia !== originales.patologia ||
      domicilio !== originales.domicilio ||
      !arraysIguales(imagenes, originales.imagenes) ||
      fecha !== originales.fecha ||
      horaInicio !== originales.horaInicio ||
      horaFin !== originales.horaFin;

    try {
      const imagenesBase64 = [];
      for (let i = 0; i < imagenes.length; i++) {
        if (typeof imagenes[i] === "string") {
          imagenesBase64.push(imagenes[i]);
        } else {
          const base64 = await toBase64(imagenes[i]);
          imagenesBase64.push(base64);
        }
      }

      const username = localStorage.getItem("username") || "Desconocido"; // Usuario que realiza la acción

      if (id) {
        const docRef = doc(db, "pacientes", id);
        await updateDoc(docRef, {
          nombre,
          edad,
          sexo,
          telefono,
          patologia,
          domicilio,
          imagenes: imagenesBase64,
          fecha,
          horaInicio,
          horaFin,
        });

        if (cambios) alert("Cambios guardados.");

        // --- LOG de edición ---
        await addDoc(collection(db, "logs"), {
          usuarioNombre: username,
          accion: `Editó cita: ${nombre}`,
          pacienteId: id,
          nombrePaciente: nombre,
          fecha: new Date(), // Timestamp de la acción
        });

        router.push("/guardado?id=" + id);
      } else {
        const docRef = await addDoc(collection(db, "pacientes"), {
          nombre,
          edad,
          sexo,
          telefono,
          patologia,
          domicilio,
          imagenes: imagenesBase64,
          fecha,
          horaInicio,
          horaFin,
        });

        alert("Paciente registrado correctamente.");

        // --- LOG de creación ---
        await addDoc(collection(db, "logs"), {
          usuarioNombre: username,
          accion: `Creó cita: ${nombre}`,
          pacienteId: docRef.id,
          nombrePaciente: nombre,
          fecha: new Date(), // Timestamp de la acción
        });

        router.push("/guardado?id=" + docRef.id);
      }
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error al guardar.");
    }
  };

  const handleImagenesChange = (e) => {
    const files = Array.from(e.target.files);
    setImagenes((prev) => [...prev, ...files]);
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls((prev) => [...prev, ...urls]);
  };

  const handleFechaChange = (e) => {
    const value = e.target.value; // YYYY-MM-DD
    if (!value) {
      setFecha("");
      return;
    }
    const d = new Date(value + "T00:00");
    const day = d.getDay();
    const year = d.getFullYear();
    if (day === 0 || day === 6) {
      alert("No se permiten sábados ni domingos. Elige otra fecha.");
      return;
    }
    if (year !== currentYear) {
      alert(`Solo se permiten fechas del año ${currentYear}`);
      return;
    }
    setFecha(value);
  };

  const inputStyle = {
    padding: "12px 15px",
    fontSize: 18,
    borderRadius: 8,
    border: "1px solid #ccc",
    boxSizing: "border-box",
    width: "100%",
  };

  // --- NUEVO: Botón volver según origen ---
  const handleVolver = () => {
    switch (origen) {
      case "marcado":
        router.push("/marcado");
        break;
      case "citas":
        router.push("/horario");
        break;
      case "guardado":
        router.push("/guardado");
        break;
      default:
        router.push("/dashboard");
    }
  };

  return (
    <div
      style={{
        maxWidth: 700,
        margin: "50px auto 30px",
        padding: 30,
        paddingLeft: 60,
        paddingRight: 50,
        backgroundColor: "white",
        borderRadius: 12,
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        fontSize: 18,
        color: "#111827",
        fontFamily: "Arial, sans-serif",
        maxHeight: "80vh",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Botón volver */}
      <button
        onClick={handleVolver}
        className="btn-volver"
        aria-label="Volver"
        title="Volver"
        style={{ position: "absolute", top:10, left: 10 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" width="22" height="22">
          <path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <h2 style={{ marginBottom: 25 }}>{id ? "Editar paciente" : `Registro para el ${fechaParam}`}</h2>

      {id && (
        <>
          <label style={{ display: "flex", flexDirection: "column", marginBottom: 20 }}>
            Fecha:
            <input
              type="date"
              value={fecha}
              onChange={handleFechaChange}
              style={{ marginTop: 5, ...inputStyle }}
              min={`${currentYear}-01-01`}
              max={`${currentYear}-12-31`}
            />
          </label>

          <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
            <label style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              Hora inicio:
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                step="1800"
                min="08:00"
                max="16:00"
                style={{ marginTop: 5, ...inputStyle }}
              />
            </label>

            <label style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              Hora fin:
              <input
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
                step="1800"
                min="08:30"
                max="16:00"
                style={{ marginTop: 5, ...inputStyle }}
              />
            </label>
          </div>
        </>
      )}

      {/* Campos uniformes */}
      <input
        placeholder="Nombre completo"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        style={{ ...inputStyle, width: "100%", marginBottom: 15 }}
      />

      <div style={{ display: "flex", gap: 20, marginBottom: 15, flexWrap: "wrap" }}>
        <input
          type="number"
          placeholder="Edad"
          value={edad}
          min="0"
          onWheel={(e) => e.target.blur()}
          onChange={(e) => setEdad(e.target.value)}
          style={{ ...inputStyle, flex: "1 1 150px", minWidth: 120 }}
        />
        <input
          placeholder="Teléfono"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          style={{ ...inputStyle, flex: "1 1 150px", minWidth: 120 }}
        />
        <select
          value={sexo}
          onChange={(e) => setSexo(e.target.value)}
          style={{ ...inputStyle, flex: "1 1 150px", minWidth: 120, backgroundColor: "#f3f4f6", color: "#111827", cursor: "pointer" }}
        >
          <option value="" disabled hidden>
            Sexo
          </option>
          <option value="Masculino">Masculino</option>
          <option value="Femenino">Femenino</option>
        </select>
      </div>

      <input
        placeholder="Domicilio"
        value={domicilio}
        onChange={(e) => setDomicilio(e.target.value)}
        style={{ ...inputStyle, width: "100%", marginBottom: 15 }}
      />

      <input
        placeholder="Patología"
        value={patologia}
        onChange={(e) => setPatologia(e.target.value)}
        style={{ ...inputStyle, width: "100%", marginBottom: 15 }}
      />

      {/* Imagenes */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 15 }}>
        <label htmlFor="file-upload" style={{ backgroundColor: "#4f46e5", color: "white", padding: "12px 20px", borderRadius: 8, cursor: "pointer" }}>
          Elegir Imágenes
        </label>
        <p style={{ margin: 0, color: "#333" }}>{imagenes.length > 0 ? `${imagenes.length} imagen(es) seleccionada(s)` : ""}</p>
      </div>
      <input id="file-upload" type="file" multiple accept="image/*" onChange={handleImagenesChange} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {previewUrls.map((url, idx) => (
          <div key={idx} style={{ position: "relative", display: "inline-block" }}>
            <img src={url} alt={`preview-${idx}`} width="100" height="100" style={{ objectFit: "cover", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }} />
            <button
              onClick={() => eliminarImagen(idx)}
              style={{
                position: "absolute",
                top: 5,
                right: 5,
                backgroundColor: "rgba(220, 38, 38, 0.9)",
                border: "none",
                borderRadius: "50%",
                color: "white",
                cursor: "pointer",
                width: 24,
                height: 24,
                fontWeight: "bold",
                lineHeight: "22px",
                padding: 0,
                boxShadow: "0 0 5px rgba(0,0,0,0.4)",
              }}
              aria-label="Eliminar imagen"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={registrarPaciente}
        style={{
          marginTop: 25,
          backgroundColor: "#2563eb",
          color: "white",
          padding: "14px 30px",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontSize: 20,
          fontWeight: "bold",
          width: "100%",
          boxShadow: "0 4px 12px rgba(37, 99, 235, 0.5)",
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#1e40af")}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#2563eb")}
      >
        Guardar
      </button>
    </div>
  );
}

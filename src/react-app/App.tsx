// src/App.tsx
import { useState } from "react";

interface Classification {
	category: string;
	confidence: number;
}

function App() {
	const [description, setDescription] = useState("");
	const [result, setResult] = useState<Classification | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const classifyExpense = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!description.trim()) return;

		setLoading(true);
		setError(null);

		try {
			// 💡 En desarrollo con Vite + Hono, asegúrate de que el proxy esté configurado 
			// o usa la URL completa si el Worker está desplegado.
			const response = await fetch("/api/ai/classify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ description }),
			});

			if (!response.ok) throw new Error("Fallo en la clasificación");

			const data = await response.json();
			
			// Cloudflare Workers AI devuelve el objeto generado en la propiedad 'response'
			// o directamente si usas response_format: { type: "json_object" }
			// Llama 3.1 suele devolver el string JSON dentro de data.response
			const parsedResult = typeof data.response === 'string' 
				? JSON.parse(data.response) 
				: data;

			setResult(parsedResult);
		} catch (err) {
			setError("No se pudo clasificar el gasto. Revisa la consola.");
			console.error(err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "400px" }}>
			<h1>Clasificador AI</h1>
			
			<form onSubmit={classifyExpense}>
				<input
					type="text"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Ej: Cena en el centro 45€"
					style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
					disabled={loading}
				/>
				<button 
					type="submit" 
					style={{ width: "100%", padding: "0.5rem", cursor: "pointer" }}
					disabled={loading}
				>
					{loading ? "Clasificando..." : "Analizar Gasto"}
				</button>
			</form>

			{error && <p style={{ color: "red" }}>{error}</p>}

			{result && (
				<div style={{ marginTop: "2rem", border: "1px solid #ccc", padding: "1rem", borderRadius: "8px" }}>
					<h3>Resultado:</h3>
					<p><strong>Categoría:</strong> {result.category}</p>
					<p><strong>Confianza:</strong> {(result.confidence * 100).toFixed(2)}%</p>
				</div>
			)}
		</div>
	);
}

export default App;
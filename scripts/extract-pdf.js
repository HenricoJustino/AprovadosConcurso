import { readFile, writeFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
try {
  const [file, output] = process.argv.slice(2);
  if (!file || !output) throw new Error('Uso: npm run extract:pdf -- prova.pdf rascunho.txt');
  const parser = new PDFParse({ data: new Uint8Array(await readFile(file)) });
  try {
    const result = await parser.getText();
    if (result.text.trim().length < 100) throw new Error('PDF sem texto suficiente. É necessário OCR e revisão manual.');
    await writeFile(output, `RASCUNHO NÃO PUBLICADO — conferir texto, figuras e gabarito definitivo no PDF original.\n\n${result.text}`, 'utf8');
    console.log(`Texto extraído para ${output}. A extração não importa nem publica questões.`);
  } finally { await parser.destroy(); }
} catch (error) { console.error(error.message); process.exitCode = 1; }

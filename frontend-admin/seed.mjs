import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const keepIds = [
    '96bd1e86-0157-4859-99a0-0e9b572b6a25', // Impuestos
    '96bd1e86-0157-4859-99a0-0e9b572b6a24', // Francés
    '96bd1e86-0157-4859-99a0-0e9b572b6a23'  // Permisos
  ];

  console.log("Cleaning up old articles...");
  const { error: deleteError } = await supabase
    .from('media')
    .delete()
    .not('id', 'in', `(${keepIds.join(',')})`);
    
  if (deleteError) {
    console.error("Delete error:", deleteError);
  } else {
    console.log("Old articles deleted successfully.");
  }

  console.log("Inserting new articles...");

  const blockCanicule = [
    { type: 'text', content: 'Ginebra y el resto de la cuenca del lago Lemán se preparan para enfrentar una intensa ola de calor (canicule) en los próximos días. Las autoridades cantonales han activado el nivel de alerta naranja y recomiendan máxima precaución a la población, especialmente a los grupos vulnerables.', bold: false, italic: false, align: 'justify' },
    { type: 'subtitle', content: 'Recomendaciones del Ministerio de Salud' },
    { type: 'text', content: 'Es fundamental mantenerse hidratado, bebiendo al menos 1.5 litros de agua al día, y evitar la exposición solar directa entre las 11:00 y las 16:00 horas. Las farmacias estarán habilitadas como "zonas frescas" para personas mayores.', bold: false, italic: true, align: 'left' },
    { type: 'text', content: '\nFuente: Resumen de MeteoSwiss y Tribune de Genève.', bold: true, italic: false, align: 'left' }
  ];

  const blockCine = [
    { type: 'text', content: 'El tan esperado estreno de "Toy Story 5" llega a las salas de cine de Ginebra (Balexert y Arena Cinemas), reviviendo la nostalgia de grandes y chicos. Sin embargo, los psicólogos infantiles locales aprovechan el momento para abrir el debate sobre el uso excesivo de pantallas en los niños.', bold: false, italic: false, align: 'justify' },
    { type: 'subtitle', content: 'La magia del cine vs La rutina de la Tablet' },
    { type: 'text', content: 'Mientras que una salida al cine es una experiencia social y cultural enriquecedora, el consumo pasivo diario en tablets está afectando la capacidad de atención de los menores. Los expertos recomiendan la regla del "3-6-9-12" para introducir pantallas de manera progresiva.', bold: false, italic: false, align: 'justify' },
    { type: 'text', content: '\nFuente: Adaptado de estudios recientes y carteleras de Pathé Suisse.', bold: true, italic: false, align: 'left' }
  ];

  const blockVacaciones = [
    { type: 'text', content: 'Se acercan las vacaciones escolares de verano y las agencias de viaje suizas han revelado cuáles son los destinos más buscados por los habitantes de Ginebra y Vaud este año.', bold: true, italic: false, align: 'center' },
    { type: 'text', content: 'A la cabeza de la lista se encuentra España (especialmente Mallorca y la Costa Blanca), seguida muy de cerca por Grecia e Italia. Según los expertos, el franco fuerte y el deseo de sol garantizado son los motivos principales de estas elecciones.', bold: false, italic: false, align: 'justify' },
    { type: 'subtitle', content: '¿Por qué estos destinos?' },
    { type: 'text', content: 'La inflación ha encarecido los destinos exóticos, lo que ha impulsado un retorno a los "clásicos europeos" que ofrecen excelente relación calidad-precio. Además, la facilidad de tomar vuelos directos desde el aeropuerto de Cointrin (GVA) influye enormemente en la decisión familiar.', bold: false, italic: false, align: 'justify' },
    { type: 'text', content: '\nFuente: Resumen de datos de agencias locales e informe de RTS.', bold: true, italic: false, align: 'left' }
  ];

  const newArticles = [
    {
      title: 'Alerta Naranja: Ginebra se prepara para la Ola de Calor (Canicule)',
      type: 'article',
      category: 'CLIMA',
      author: 'Rubén Cardozo',
      description: JSON.stringify(blockCanicule),
      content_url: 'https://www.tdg.ch',
      image_url: '["https://images.unsplash.com/photo-1504370805625-d32c54b16100?q=80&w=800"]',
      published_at: new Date().toISOString()
    },
    {
      title: 'Estreno de Toy Story: El debate sobre el tiempo de pantallas en los niños',
      type: 'article',
      category: 'CULTURA',
      author: 'Rubén Cardozo',
      description: JSON.stringify(blockCine),
      content_url: 'https://www.pathe.ch',
      image_url: '["https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800"]',
      published_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      title: 'Destinos Favoritos 2026: ¿Dónde van de vacaciones los suizos y por qué?',
      type: 'article',
      category: 'TENDENCIAS',
      author: 'Rubén Cardozo',
      description: JSON.stringify(blockVacaciones),
      content_url: 'https://www.rts.ch',
      image_url: '["https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800"]',
      published_at: new Date(Date.now() - 7200000).toISOString()
    }
  ];

  const { error: insertError } = await supabase
    .from('media')
    .insert(newArticles);

  if (insertError) {
    console.error("Insert error:", insertError);
  } else {
    console.log("Successfully inserted 3 new articles!");
  }
}

seed().catch(console.error);

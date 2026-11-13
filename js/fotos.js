/* Casa Nueve — datos: WhatsApp, fotos (orden de la galería) y grupos del visor.
   Orden: exterior → sala y comedor → detalles de madera → habitaciones (por color) → baños al final. */
window.NUEVE = {
  wa: '584127398347',
  waMsg: {
    es: 'Hola, quiero información para reservar Casa Nueve en Madrisqui, Los Roques.',
    en: "Hi, I'd like information to book Casa Nueve on Madrisqui, Los Roques."
  },
  fotos: [
    { f: 'staff',                     es: 'La entrada y el equipo de la casa',     en: 'The entrance and the house team' },
    { f: 'vista-a-la-playa',          es: 'La playa de Madrisqui desde la casa',   en: 'Madrisqui beach from the house' },
    { f: 'sala-comedor-vista-al-mar', es: 'Sala y comedor abiertos al mar',        en: 'Living and dining room open to the sea' },
    { f: 'sala',                      es: 'La sala',                               en: 'The living room' },
    { f: 'sofa-cojines',              es: 'Sofá frente a la playa',                en: 'Sofa facing the beach' },
    { f: 'sillas-sala',               es: 'Rincón de lectura',                     en: 'Reading corner' },
    { f: 'lamparas',                  es: 'Lámparas tejidas',                      en: 'Woven lamps' },
    { f: 'mesa-comedor',              es: 'La mesa del comedor',                   en: 'The dining table', v: 1 },
    { f: 'mesa-detalle',              es: 'Mesa servida',                          en: 'A set table', v: 1 },
    { f: 'detalle-mesa',              es: 'Madera noble',                          en: 'Fine wood', v: 1 },
    { f: 'habitacion-azul',           es: 'Habitación azul',                       en: 'Blue bedroom' },
    { f: 'portada',                   es: 'Detalles de la habitación azul',        en: 'Blue bedroom details' },
    { f: 'toallas',                   es: 'Toallas de la casa',                    en: 'House towels' },
    { f: 'habitacion-amarilla',       es: 'Habitación amarilla',                   en: 'Yellow bedroom' },
    { f: 'cojin-colorido',            es: 'Cojines tejidos',                       en: 'Woven cushions' },
    { f: 'toallas-cojin',             es: 'Bienvenida en la habitación',           en: 'Welcome in the bedroom' },
    { f: 'habitacion-rosada',         es: 'Habitación rosada',                     en: 'Pink bedroom' },
    { f: 'habitacion-literas',        es: 'Habitación con literas',                en: 'Bunk bedroom' },
    { f: 'espejo',                    es: 'Espejo de fibra natural',               en: 'Natural fibre mirror' },
    { f: 'bano-espejo',               es: 'Baño',                                  en: 'Bathroom' },
    { f: 'bano-ventana',              es: 'Baño con ventana',                      en: 'Bathroom with window' },
    { f: 'bano-pasillo',              es: 'Baño de la habitación rosada',          en: 'Pink bedroom bathroom' },
    { f: 'bano-amarillo',             es: 'Baño de la habitación amarilla',        en: 'Yellow bedroom bathroom' },
    { f: 'bano-verde',                es: 'Baño verde',                            en: 'Green bathroom' }
  ],
  sets: {
    rosada:   ['habitacion-rosada', 'bano-pasillo'],
    azul:     ['habitacion-azul', 'portada', 'toallas', 'bano-espejo'],
    amarilla: ['habitacion-amarilla', 'cojin-colorido', 'toallas-cojin', 'bano-amarillo'],
    literas:  ['habitacion-literas', 'bano-verde'],
    casa:     ['sala-comedor-vista-al-mar', 'sala', 'sofa-cojines', 'vista-a-la-playa', 'lamparas', 'sillas-sala']
  }
};

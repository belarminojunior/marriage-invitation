/**
 * First-run defaults. The couple edits all of this on the admin app ("Evento"), which saves it in
 * the Google Sheet; these values are only used until then (and in demo mode).
 * Guest-facing copy is in Portuguese (as in the design); code identifiers are in English.
 */

export const wedding = {
  bride: "Kendra",
  groom: "Aloud",
  monogram: "KA",

  /** Local date and time of the ceremony (ISO 8601, venue time zone). */
  ceremonyStart: "2027-02-13T15:00:00+02:00",
  timeZone: "Africa/Maputo",
  cityLabel: "Matola",
  rsvpDeadlineLabel: "Responda até 15 de janeiro de 2027",

  parents: {
    bride: ["[Pai da noiva]", "[Mãe da noiva]"],
    groom: ["[Pai do noivo]", "[Mãe do noivo]"],
  },

  song: {
    title: "[Título da nossa música]",
    artist: "[Artista]",
  },

  invitationText:
    "É com grande alegria que vos convidamos para a cerimónia do nosso casamento. Venham celebrar connosco esta nova etapa das nossas vidas.",

  schedule: [
    { icon: "welcome", label: "Boas-vindas", time: "14:30" },
    { icon: "ceremony", label: "Cerimónia", time: "15:00" },
    { icon: "dinner", label: "Jantar", time: "16:00" },
    { icon: "cake", label: "Corte do bolo", time: "18:00" },
    { icon: "party", label: "Festa", time: "20:00" },
  ] as const,

  verse: {
    text: "“E, sobre tudo isto, revesti-vos de amor, que é o vínculo da perfeição.”",
    reference: "Colossenses 3:14",
  },

  venue: {
    name: "Reus Wedding Venue",
    shortAddress: "Reus Wedding Venue, Matola-Mozal",
    address: "[Endereço], Matola-Mozal, Maputo",
    /** Used for the embedded map and the directions links. */
    mapQuery: "Reus Wedding Venue, Matola, Mozambique",
    parkingNote: "Estacionamento gratuito no local. Os portões abrem às 14:00.",
  },

  gallery: {
    quote:
      "“[Uma frase curta sobre a vossa história — como se conheceram, ou o local da sessão.]”",
  },

  /** Default tables created the first time the Google Sheet is initialised. */
  defaultTables: [
    "Quioto",
    "Lisboa",
    "Marraquexe",
    "Cidade do Cabo",
    "Florença",
    "Havana",
    "Paris",
    "Istambul",
    "Praga",
    "Rio de Janeiro",
  ],
  defaultTableCapacity: 10,
} as const;


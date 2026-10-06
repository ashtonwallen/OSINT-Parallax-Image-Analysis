import type { Analysis } from './schema';
export const demos = [
  {
    id: 'square',
    title: 'The afternoon square',
    region: 'Southern European cues',
    image: '/samples/square.jpg',
    tag: 'SIGNAGE · SHADOWS',
  },
  {
    id: 'harbor',
    title: 'A quiet northern harbor',
    region: 'Nordic coastal cues',
    image: '/samples/harbor.jpg',
    tag: 'ARCHITECTURE · CLIMATE',
  },
];
export const demoAnalysis: Record<string, Analysis> = {
  square: {
    summary:
      'Portuguese signage, patterned paving and a yellow tram suggest a southern European urban setting. These are hand-authored observations of a synthetic scene, not a verified location.',
    clues: [
      {
        category: 'Text & signage',
        observation: 'The street sign reads “RUA DA PRATA”. “Rua” is a Portuguese word for street.',
        language: 'Portuguese',
        confidence: 'High',
        region: 'Portuguese-speaking regions',
      },
      {
        category: 'Roads & driving',
        observation:
          'Tram rails and patterned stone paving suggest an established urban tram network. Driving side is not reliably visible.',
        confidence: 'Low',
        region: 'European urban areas; not specific',
      },
      {
        category: 'Architecture',
        observation:
          'Warm plaster façades, decorative balconies and stone window surrounds resemble historic southern European streets.',
        confidence: 'Medium',
        region: 'Portugal and other southern European regions',
      },
      {
        category: 'Vegetation & climate',
        observation: 'Vegetation is too limited to provide an independent climate clue.',
        confidence: 'Low',
        region: 'Undetermined',
      },
      {
        category: 'Vehicles & plates',
        observation:
          'A classic yellow streetcar is consistent with Portuguese tram systems. No plate information is used.',
        confidence: 'Medium',
        region: 'Portugal; appearance is not exclusive',
      },
      {
        category: 'Weather & lighting',
        observation:
          'Clear skies and a pronounced streetlamp shadow indicate direct sunlight. Time needs a calibrated ground direction.',
        confidence: 'Medium',
        region: 'Not geographically diagnostic',
      },
    ],
  },
  harbor: {
    summary:
      'Timber waterfront buildings and coniferous hills suggest a northern coastal environment. These hand-authored demo clues are illustrative; the scene has no real location.',
    clues: [
      {
        category: 'Text & signage',
        observation: 'No legible signage is visible.',
        language: 'Undetermined',
        confidence: 'Low',
        region: 'Undetermined',
      },
      {
        category: 'Roads & driving',
        observation: 'The waterfront has no clear traffic flow or usable road markings.',
        confidence: 'Low',
        region: 'Undetermined',
      },
      {
        category: 'Architecture',
        observation:
          'Red timber warehouses with pitched roofs resemble Nordic maritime construction.',
        confidence: 'Medium',
        region: 'Northern Europe',
      },
      {
        category: 'Vegetation & climate',
        observation:
          'Coniferous slopes are consistent with a cool temperate or boreal environment.',
        confidence: 'Medium',
        region: 'Northern temperate regions',
      },
      {
        category: 'Vehicles & plates',
        observation:
          'Small boats and bicycles offer little regional specificity; no plate information is visible.',
        confidence: 'Low',
        region: 'Undetermined',
      },
      {
        category: 'Weather & lighting',
        observation: 'Overcast diffuse light produces no distinct measurable shadow.',
        confidence: 'High',
        region: 'Not geographically diagnostic',
      },
    ],
  },
};

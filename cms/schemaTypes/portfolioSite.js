export default {
  name: 'portfolioSite',
  title: 'Réalisation (boutique Shopify)',
  type: 'document',
  fields: [
    {
      name: 'name',
      title: 'Nom de la boutique',
      type: 'string',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'url',
      title: 'URL du site',
      type: 'url',
      validation: (Rule) => Rule.required(),
    },
    {
      name: 'images',
      title: 'Captures d\'écran',
      type: 'array',
      of: [{type: 'image'}],
      options: {layout: 'grid'},
      validation: (Rule) => Rule.min(1),
    },
  ],
  preview: {
    select: {title: 'name', media: 'images.0'},
  },
}

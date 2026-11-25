import { Panel } from './ui';

const tiers = [
  {
    name: 'Econômico',
    image: 'economico',
    author: 'Fotografia',
    source: 'https://unsplash.com/photos/ig3TQMJElAw',
  },
  {
    name: 'Standard',
    image: 'standard',
    author: 'Jenevy Vergara',
    source: 'https://unsplash.com/photos/8hGJaAJyzIg',
  },
  {
    name: 'Superior',
    image: 'superior',
    author: 'Meklay YOTKHAMSAY',
    source: 'https://unsplash.com/photos/mNdhu5gl_P4',
  },
] as const;
export function AccommodationTiers() {
  return (
    <Panel
      title="Três categorias para orientar a escolha"
      subtitle="Fotografias ilustrativas; não são hotéis parceiros, ofertas ou comprovação do padrão de um pacote T4F."
    >
      <div className="grid gap-5 md:grid-cols-3">
        {tiers.map((tier) => (
          <figure key={tier.name}>
            <img
              src={`${import.meta.env.BASE_URL}images/accommodations/${tier.image}.jpg`}
              width="1000"
              height="667"
              loading="lazy"
              className="aspect-[3/2] w-full rounded-lg object-cover"
              alt={`Ambiente de hospedagem ilustrativo para ${tier.name}; estabelecimento não vinculado à Tour4Friends`}
            />
            <figcaption className="mt-3">
              <h3 className="font-semibold">{tier.name}</h3>
              <p className="mt-1 text-sm">
                Imagem ilustrativa ·{' '}
                <a href={tier.source} className="underline" rel="noreferrer" target="_blank">
                  {tier.author} / Unsplash
                </a>
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-4 text-sm">
        A categoria do orçamento segue a documentação comercial, não a fotografia. Econômico e
        Lisboa permanecem sem tarifa. Especificações de serviços e equivalências com o histórico
        aguardam validação da empresa.
      </p>
    </Panel>
  );
}

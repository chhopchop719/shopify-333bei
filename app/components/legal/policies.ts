/**
 * Shop policies exposed by the Storefront API, in the order customers look
 * for them (same as the footer), with French titles and what each one
 * answers. `about` names the subject in the shop's voice ("Une question sur
 * vos données personnelles ?"); `ask` names it in the customer's, to start
 * their message on the contact page ("j'ai une question sur mes données…").
 */
export const POLICIES = [
  {
    handle: 'shipping-policy',
    key: 'shippingPolicy',
    title: 'Livraison',
    summary: 'Délais, frais et suivi de votre colis.',
    about: 'la livraison',
    ask: 'la livraison de ma commande',
  },
  {
    handle: 'refund-policy',
    key: 'refundPolicy',
    title: 'Retours et remboursements',
    summary: 'Retourner ou échanger une pièce, et être remboursé.',
    about: 'les retours et remboursements',
    ask: 'un retour ou un remboursement',
  },
  {
    handle: 'terms-of-service',
    key: 'termsOfService',
    title: 'Conditions générales de vente',
    summary: 'Les règles qui s’appliquent à chaque commande.',
    about: 'les conditions de vente',
    ask: 'les conditions de vente',
  },
  {
    handle: 'privacy-policy',
    key: 'privacyPolicy',
    title: 'Politique de confidentialité',
    summary: 'Les données que nous recueillons et ce que nous en faisons.',
    about: 'vos données personnelles',
    ask: 'mes données personnelles',
  },
] as const;

export type PolicyKey = (typeof POLICIES)[number]['key'];

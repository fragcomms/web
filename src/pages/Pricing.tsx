import { PricingTierCard } from "../components/PricingTierCard";

export function Pricing() {
  const pricingTiers = [
    {
      title: "Placeholder",
      price: 0,
      features: [
        "Placeholder",
        "Placeholder",
        "Placeholder",
        "Placeholder",
        "Placeholder",
      ],
      buttonText: "Placeholder",
      highlighted: false,
    },
    {
      title: "Placeholder",
      price: 0,
      features: [
        "Placeholder",
        "Placeholder",
        "Placeholder",
        "Placeholder",
        "Placeholder",
      ],
      buttonText: "Placeholder",
      highlighted: false,
    },
    {
      title: "Placeholder",
      price: 0,
      features: [
        "Placeholder",
        "Placeholder",
        "Placeholder",
        "Placeholder",
        "Placeholder",
      ],
      buttonText: "Placeholder",
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen py-20 px-5 bg-slate-50 text-slate-900 dark:bg-transparent dark:text-inherit">
      <div className="max-w-300 mx-auto">
        {/* Header Section */}
        <div className="text-center mb-15">
          <h1 className="font-['Inter:Bold',sans-serif] font-bold text-[48px] text-slate-900 dark:text-white tracking-[-0.96px] mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="font-['Inter:Regular',sans-serif] text-[18px] text-slate-600 dark:text-slate-300 max-w-150 mx-auto">
            Choose the perfect plan for your team. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {pricingTiers.map((tier, index) => (
            <div key={index} className="h-full">
              <PricingTierCard
                title={tier.title}
                price={tier.price}
                features={tier.features}
                buttonText={tier.buttonText}
                highlighted={tier.highlighted}
              />
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h2 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[32px] text-slate-900 dark:text-white tracking-[-0.64px] mb-6">
            Frequently Asked Questions
          </h2>
          <div className="max-w-200 mx-auto space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-lg p-6 text-left border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
              <h3 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[18px] text-slate-900 dark:text-slate-100 mb-2">
                Can I change plans later?
              </h3>
              <p className="font-['Inter:Regular',sans-serif] text-[16px] text-slate-600 dark:text-slate-300">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing
                cycle.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg p-6 text-left border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
              <h3 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[18px] text-slate-900 dark:text-slate-100 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="font-['Inter:Regular',sans-serif] text-[16px] text-slate-600 dark:text-slate-300">
                We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-lg p-6 text-left border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
              <h3 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[18px] text-slate-900 dark:text-slate-100 mb-2">
                Is there a refund policy?
              </h3>
              <p className="font-['Inter:Regular',sans-serif] text-[16px] text-slate-600 dark:text-slate-300">
                We offer a 30-day money-back guarantee. If you're not satisfied, we'll refund your payment in full.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

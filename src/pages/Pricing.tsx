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
    <div className="min-h-screen py-[80px] px-[20px]">
      <div className="max-w-[1200px] mx-auto">
        {/* Header Section */}
        <div className="text-center mb-[60px]">
          <h1 className="font-['Inter:Bold',sans-serif] font-bold text-[48px] text-white tracking-[-0.96px] mb-[16px]">
            Simple, Transparent Pricing
          </h1>
          <p className="font-['Inter:Regular',sans-serif] text-[18px] text-white max-w-[600px] mx-auto">
            Choose the perfect plan for your team. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[32px] items-stretch">
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
        <div className="mt-[80px] text-center">
          <h2 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[32px] text-white tracking-[-0.64px] mb-[24px]">
            Frequently Asked Questions
          </h2>
          <div className="max-w-[800px] mx-auto space-y-[24px]">
            <div className="bg-white rounded-[8px] p-[24px] text-left border border-[#d9d9d9]">
              <h3 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[18px] text-[#1e1e1e] mb-[8px]">
                Can I change plans later?
              </h3>
              <p className="font-['Inter:Regular',sans-serif] text-[16px] text-[#757575]">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
              </p>
            </div>
            <div className="bg-white rounded-[8px] p-[24px] text-left border border-[#d9d9d9]">
              <h3 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[18px] text-[#1e1e1e] mb-[8px]">
                What payment methods do you accept?
              </h3>
              <p className="font-['Inter:Regular',sans-serif] text-[16px] text-[#757575]">
                We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.
              </p>
            </div>
            <div className="bg-white rounded-[8px] p-[24px] text-left border border-[#d9d9d9]">
              <h3 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[18px] text-[#1e1e1e] mb-[8px]">
                Is there a refund policy?
              </h3>
              <p className="font-['Inter:Regular',sans-serif] text-[16px] text-[#757575]">
                We offer a 30-day money-back guarantee. If you're not satisfied, we'll refund your payment in full.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

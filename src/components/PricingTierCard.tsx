interface PricingTierCardProps {
  title: string;
  price: number;
  period?: string;
  features: string[];
  buttonText: string;
  highlighted?: boolean;
}

export function PricingTierCard({
  title,
  price,
  period = "/ mo",
  features,
  buttonText,
  highlighted = false,
}: PricingTierCardProps) {
  return (
    <div
      className={`bg-white relative rounded-[8px] size-full ${
        highlighted ? "ring-2 ring-[#2c2c2c] shadow-lg" : ""
      }`}
      data-name="Pricing Card"
    >
      <div className="content-stretch flex flex-col gap-[24px] items-center min-w-[inherit] overflow-clip p-[32px] relative rounded-[inherit] size-full">
        <div
          className="content-stretch flex flex-col gap-[16px] items-center justify-end relative shrink-0 w-full"
          data-name="Top"
        >
          <div
            className="content-stretch flex h-[29px] items-start relative shrink-0 w-full"
            data-name="Text Heading"
          >
            <p className="flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.2] min-h-px min-w-px not-italic relative text-[#1e1e1e] text-[24px] text-center tracking-[-0.48px] whitespace-pre-wrap">
              {title}
            </p>
          </div>
          <div
            className="content-stretch flex items-end justify-center not-italic relative shrink-0 text-[#1e1e1e]"
            data-name="Text Price"
          >
            <div
              className="content-stretch flex font-['Inter:Bold',sans-serif] font-bold items-start leading-none relative shrink-0"
              data-name="Price"
            >
              <p className="relative shrink-0 text-[24px] tracking-[-0.48px]">$</p>
              <p className="relative shrink-0 text-[48px] tracking-[-0.96px]">{price}</p>
            </div>
            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.8] relative shrink-0 text-[14px]">
              {period}
            </p>
          </div>
          <div
            className="content-stretch flex flex-col gap-[12px] items-start relative shrink-0 w-full"
            data-name="Text List"
          >
            {features.map((feature, index) => (
              <div
                key={index}
                className="h-[22px] relative shrink-0 w-full"
                data-name="Text List Item"
              >
                <div className="absolute flex flex-col font-['Inter:Regular',sans-serif] font-normal inset-0 justify-center leading-[0] not-italic text-[#757575] text-[16px]">
                  <ul>
                    <li className="list-disc ms-[24px] whitespace-pre-wrap">
                      <span className="leading-[1.4]">{feature}</span>
                    </li>
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          className="bg-[#2c2c2c] relative rounded-[8px] shrink-0 w-full hover:bg-[#1a1a1a] transition-colors"
          data-name="Button"
        >
          <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-[8px] items-center justify-center p-[12px] relative w-full">
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-none not-italic relative shrink-0 text-[#f5f5f5] text-[16px]">
                {buttonText}
              </p>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="absolute border border-[#2c2c2c] border-solid inset-0 pointer-events-none rounded-[8px]"
          />
        </button>
      </div>
      <div
        aria-hidden="true"
        className="absolute border border-[#d9d9d9] border-solid inset-0 pointer-events-none rounded-[8px]"
      />
    </div>
  );
}

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
      className={`bg-white dark:bg-slate-900 relative rounded-lg size-full ${highlighted ? "ring-2 ring-slate-700 dark:ring-slate-200 shadow-lg" : ""}`}
      data-name="Pricing Card"
    >
      <div className="content-stretch flex flex-col gap-6 items-center min-w-[inherit] overflow-clip p-8 relative rounded-[inherit] size-full">
        <div
          className="content-stretch flex flex-col gap-4 items-center justify-end relative shrink-0 w-full"
          data-name="Top"
        >
          <div
            className="content-stretch flex h-7.25 items-start relative shrink-0 w-full"
            data-name="Text Heading"
          >
            <p className="flex-[1_0_0] font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.2] min-h-px min-w-px not-italic relative text-slate-900 dark:text-slate-100 text-[24px] text-center tracking-[-0.48px] whitespace-pre-wrap">
              {title}
            </p>
          </div>
          <div
            className="content-stretch flex items-end justify-center not-italic relative shrink-0 text-slate-900 dark:text-slate-100"
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
            className="content-stretch flex flex-col gap-3 items-start relative shrink-0 w-full"
            data-name="Text List"
          >
            {features.map((feature, index) => (
              <div
                key={index}
                className="h-5.5 relative shrink-0 w-full"
                data-name="Text List Item"
              >
                <div className="absolute flex flex-col font-['Inter:Regular',sans-serif] font-normal inset-0 justify-center leading-0 not-italic text-slate-600 dark:text-slate-300 text-[16px]">
                  <ul>
                    <li className="list-disc ms-6 whitespace-pre-wrap">
                      <span className="leading-[1.4]">{feature}</span>
                    </li>
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
        <button
          className="bg-slate-800 dark:bg-slate-100 relative rounded-lg shrink-0 w-full hover:bg-slate-700 dark:hover:bg-white transition-colors"
          data-name="Button"
        >
          <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
            <div className="content-stretch flex gap-2 items-center justify-center p-3 relative w-full">
              <p className="font-['Inter:Regular',sans-serif] font-normal leading-none not-italic relative shrink-0 text-slate-100 dark:text-slate-900 text-[16px]">
                {buttonText}
              </p>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="absolute border border-slate-800 dark:border-slate-100 border-solid inset-0 pointer-events-none rounded-lg"
          />
        </button>
      </div>
      <div
        aria-hidden="true"
        className="absolute border border-slate-200 dark:border-slate-700 border-solid inset-0 pointer-events-none rounded-lg"
      />
    </div>
  );
}

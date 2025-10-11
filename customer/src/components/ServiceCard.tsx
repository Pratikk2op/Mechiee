import React, { useEffect, useCallback, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Bike, Zap, Gauge } from "lucide-react";

interface ServiceCardProps {
  title: string;
  price: string;
  originalPrice: string;
  models: string[];
  icon: React.ReactNode;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  price,
  originalPrice,
  models,
  icon,
}) => {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-xl rounded-2xl p-5 border border-gray-200 dark:border-gray-700 flex flex-col hover:shadow-green-500/20 hover:shadow-2xl transition-all duration-500 hover:scale-105 relative overflow-hidden h-full">
      {/* Background decoration */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-green-500/5 rounded-full blur-2xl"></div>
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-green-500/5 rounded-full blur-2xl"></div>
      
      <div className="relative z-10">
        {/* Icon */}
        <div className="flex justify-center mb-3">
          <div className="text-green-600 dark:text-green-400">{icon}</div>
        </div>

        {/* Title */}
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 text-center leading-tight">
          {title}
        </h2>

        {/* Price Badge */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-3 mb-4 shadow-lg">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white">
              {price}
            </span>
            <span className="text-sm line-through text-green-100">
              {originalPrice}
            </span>
          </div>
          <p className="text-center text-green-50 text-xs mt-1 font-medium">
            Special Offer Price
          </p>
        </div>

        {/* Bike Models Grid */}
        <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-3 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 text-center">
            Compatible Models
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {models.map((model, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-900 rounded-lg p-2 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-500 transition-all duration-300"
              >
                <div className="flex items-start gap-1.5">
                  <div className="flex-shrink-0 w-1.5 h-1.5 bg-green-500 rounded-full mt-1.5"></div>
                  <span className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">
                    {model}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ServiceCards: React.FC = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "center",
      skipSnaps: false,
    },
    [
      Autoplay({
        delay: 5000,
        stopOnInteraction: false,
      }),
    ]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const services = [
    {
      title: "Doorstep Servicing (100cc to 125cc)",
      price: "₹749 - ₹799",
      originalPrice: "₹899",
      icon: <Bike size={48} strokeWidth={1.5} />,
      models: [
        "Hero Splendor Plus (97.2cc)",
        "Hero HF Deluxe (97.2cc)",
        "Hero Passion Pro (113cc)",
        "Hero Glamour (125cc)",
        "Hero Super Splendor (124.7cc)",
        "Honda CD 110 Dream (109.5cc)",
        "Honda Shine 125 (123.94cc)",
        "Honda SP 125 (124cc)",
        "Honda Livo (109.51cc)",
        "Bajaj Platina 100 (102cc)",
        "Bajaj CT 110X (115.45cc)",
        "Bajaj Pulsar 125 (124.4cc)",
        "Bajaj Discover 125",
        "TVS Sport (109.7cc)",
        "TVS Radeon (109.7cc)",
        "TVS Star City Plus (109.7cc)",
        "TVS Victor 110",
        "TVS Raider 125 (124.8cc)",
      ],
    },
    {
      title: "Bike Service (150cc to 160cc)",
      price: "₹999 - ₹1,199",
      originalPrice: "₹1,299",
      icon: <Zap size={48} strokeWidth={1.5} />,
      models: [
        "Honda Unicorn (162.7cc)",
        "Honda X-Blade (162.7cc)",
        "Honda SP160 (162cc)",
        "Bajaj Pulsar 150 (149.5cc)",
        "Bajaj Pulsar N150 (149.6cc)",
        "Bajaj Pulsar N160 (164.82cc)",
        "Bajaj Pulsar P150 (149.68cc)",
        "Yamaha FZ-FI (149cc)",
        "Yamaha FZS-FI (149cc)",
        "Yamaha FZ-X (149cc)",
        "Yamaha R15S (155cc)",
        "Yamaha MT-15 V2 (155cc)",
        "Suzuki Gixxer 155 (155cc)",
        "Suzuki Gixxer SF 155 (155cc)",
      ],
    },
    {
      title: "Doorstep Scooter Service (100cc to 125cc)",
      price: "₹799 - ₹999",
      originalPrice: "₹1,100",
      icon: <Gauge size={48} strokeWidth={1.5} />,
      models: [
        "TVS Scooty Pep+ (87.8cc)",
        "TVS Zest 110 (109.7cc)",
        "TVS Jupiter 110 (109.7cc)",
        "TVS Jupiter 125 (124.8cc)",
        "TVS NTorq 125 (124.8cc)",
        "Honda Dio (109.5cc)",
        "Honda Activa 6G (109.5cc)",
        "Honda Activa 125 (124cc)",
        "Honda Grazia 125 (124cc)",
        "Hero Pleasure+ XTEC (110.9cc)",
        "Hero Maestro Edge 110 (110.9cc)",
        "Hero Destini 125 XTEC (124.6cc)",
        "Hero Maestro Edge 125 (124.6cc)",
        "Suzuki Access 125 (124cc)",
        "Suzuki Avenis 125 (124cc)",
        "Suzuki Burgman Street 125 (124cc)",
      ],
    },
  ];

  return (
    <div className="bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 py-8 px-4 sm:px-6 lg:px-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r text-black bg-clip-text mb-2 dark:text-white">
          Premium Doorstep Services
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-base max-w-2xl mx-auto">
          Professional bike servicing at your doorstep with special pricing
        </p>
      </div>

      <div className="relative max-w-5xl mx-auto">
        {/* Carousel Container */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {services.map((service, index) => (
              <div
                key={index}
                className="flex-[0_0_100%] sm:flex-[0_0_85%] lg:flex-[0_0_75%] min-w-0"
              >
                <ServiceCard {...service} />
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <button
          onClick={scrollPrev}
          className="absolute -left-4 sm:left-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white p-3 rounded-full shadow-xl transition-all duration-300 hover:scale-110 z-20"
          aria-label="Previous slide"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          onClick={scrollNext}
          className="absolute -right-4 sm:right-0 top-1/2 -translate-y-1/2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white p-3 rounded-full shadow-xl transition-all duration-300 hover:scale-110 z-20"
          aria-label="Next slide"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Dots Indicator */}
        <div className="flex justify-center gap-2 mt-6">
          {services.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`transition-all duration-300 rounded-full ${
                index === selectedIndex
                  ? "w-8 h-2.5 bg-gradient-to-r from-green-600 to-green-500"
                  : "w-2.5 h-2.5 bg-gray-300 dark:bg-gray-700 hover:bg-green-400"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServiceCards;
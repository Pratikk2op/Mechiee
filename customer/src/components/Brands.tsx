
import './Brands.css';

const Brands = () => {
  const images = [
    "asset 1.png", "asset 2.png", "asset 3.png", "asset 4.png",
    "asset 5.png", "asset 6.png", "asset 7.png", "asset 8.png",
    "asset 9.png", "asset 10.png", "asset 11.png", "asset 12.png"
  ];

  // Duplicate for seamless infinite scroll
  const duplicatedImages = [...images, ...images];

  return (
    <div className="bg-white py-3">
      <div className="overflow-hidden relative">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
          {duplicatedImages.map((image, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-32 h-16 sm:w-40 sm:h-20 md:w-48 md:h-24"
            >
              <img
                src={`/images/${image}`}
                alt={`brand-${index}`}
                className="object-contain w-full h-full"
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Brands;

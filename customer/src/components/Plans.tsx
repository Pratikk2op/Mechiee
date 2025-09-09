

const plans = [
  {
    name: "Starter",
    price: "₹999",
    services: "2 General Services",
    pickupDrop: "₹99 per use",
    garageType: "Standard",
    emergencyHelp: "Not included",
    discount: "None",
    seasonalCheckup: "Not included",
    bookingPriority: "Standard",
    support: "Chat only",
  },
  {
    name: "Smart-Ride",
    price: "₹1999",
    services: "4 Services (general + minor)",
    pickupDrop: "2 Free/year",
    garageType: "Priority Garages",
    emergencyHelp: "1/year",
    discount: "10% on select items",
    seasonalCheckup: "1 (e.g. Monsoon Prep)",
    bookingPriority: "1.2x priority queue",
    support: "Priority chat/call",
  },
  {
    name: "Pro-Gear",
    price: "₹2999",
    services: "6 Services + 2 Emergency",
    pickupDrop: "Unlimited",
    garageType: "Elite/Verified Garages",
    emergencyHelp: "2/year + 1 Roadside Assist",
    discount: "15% + Warranty Cover",
    seasonalCheckup: "2 (e.g. Monsoon + Diwali)",
    bookingPriority: "2x priority + direct line",
    support: "Dedicated advisor",
  },
];

const Plans = () => {
  return (
    <section  id="plans" className="bg-gray-50 py-8 px-4 dark:bg-gray-800/50 backdrop-blur-sm">
    <h2 className="text-3xl font-bold text-center mb-10 dark:text-white">Ride Smarter, Choose Your Plan</h2>
    <div className="max-w-7xl mx-auto grid gap-8 sm:grid-cols-1 md:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className="bg-white rounded-xl shadow-md p-6 flex flex-col
                     transform transition-transform duration-300
                     hover:scale-105  hover:shadow-2xl hover:z-10 relative hover:border hover:border-green-500"
        >
          <h3 className="text-2xl font-extrabold mb-4 text-center">{plan.name}</h3>
          <p className="text-center  font-bold  mb-6">
            <span className="text-3xl text-green-400">{plan.price}</span>/<span className="text-md font-bold text-black">year</span>
          </p>

          <ul className="flex-grow space-y-3 text-gray-700 text-md">
            <li>
              <strong>Included Services:</strong> {plan.services}
            </li>
            <li>
              <strong>Pickup/Drop:</strong> {plan.pickupDrop}
            </li>
            <li>
              <strong>Garage Type:</strong> {plan.garageType}
            </li>
            <li>
              <strong>Emergency Help:</strong> {plan.emergencyHelp}
            </li>
            <li>
              <strong>Discount on Parts:</strong> {plan.discount}
            </li>
            <li>
              <strong>Seasonal Check-up:</strong> {plan.seasonalCheckup}
            </li>
            <li>
              <strong>Booking Priority:</strong> {plan.bookingPriority}
            </li>
            <li>
              <strong>Support:</strong> {plan.support}
            </li>
          </ul>

          <div className="flex justify-center w-full">
            <button
            type="button"
            className="mt-8 w-[200px]  bg-gradient-to-r from-blue-400 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-500 hover:to-green-700 transition-all duration-200"
          >
            Choose {plan.name}
          </button>
          </div>
        </div>
      ))}
    </div>
  </section>
  );
};

export default Plans;

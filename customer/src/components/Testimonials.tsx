import React from "react";
import "./Testimonials.css"
import { 
  Wrench, 
  MapPin, 
  Clock, 
  CreditCard, 
  Star, 
  Smartphone,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Calendar,
  MessageCircle
} from 'lucide-react';

const testimonials = [
  { name: "Amit Kale", location: "Hinjewadi, Pune", message: "Fast and reliable service. My bike was picked up and returned on time. Highly recommended!" },
  { name: "Sneha Patil", location: "Pimple Nilakh, Pune", message: "Loved the doorstep service! No hassle, and the team was very professional." },
  { name: "Rahul Deshmukh", location: "Baner, Pune", message: "They fixed my bike’s chain issue quickly. Impressive response time and good pricing." },
  { name: "Neha Jagtap", location: "Hinjewadi, Pune", message: "The staff was very polite and experienced. Explained the repairs in detail." },
  { name: "Saurabh Kulkarni", location: "Wakad, Pune", message: "Smooth experience overall. Booking and service were both easy and efficient." },
  { name: "Pooja More", location: "Wakad, Pune", message: "Quick response and quality service. My go-to option for bike maintenance in Pune." },
  { name: "Manish Pawar", location: "Balewadi, Pune", message: "Great experience! The mechanic arrived on time and fixed my bike perfectly." },
  { name: "Divya Joshi", location: "Pimple Nilakh, Pune", message: "Excellent servicing. Loved the transparency and updates during the process." },
  { name: "Ashutosh Rane", location: "Baner, Pune", message: "Very professional service. They even cleaned the bike after repairs." },
  { name: "Prajakta Naik", location: "Hinjewadi, Pune", message: "Affordable and convenient. Booking was super easy, and service was on time." },
  { name: "Nikhil Shinde", location: "Balewadi, Pune", message: "The best experience I’ve had with a servicing app so far!" },
  { name: "Rekha Wagh", location: "Wakad, Pune", message: "I didn't have to step out. Everything was done at home. Very impressive!" },
  { name: "Omkar Gokhale", location: "Baner, Pune", message: "No hidden charges and everything was explained upfront. Trustworthy." },
  { name: "Ritika Chavan", location: "Hinjewadi, Pune", message: "Highly responsive team. My bike runs much smoother now." },
  { name: "Karan Bhagat", location: "Pimple Nilakh, Pune", message: "Best doorstep bike service in Pune. Super easy to schedule and reliable staff." },
];

const InfiniteTestimonials = () => {
  return (
    <>
       <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 py-5 relative " id="testimonials">
        <h2 className="text-4xl font-extrabold text-center mb-2 dark:text-white">What Our Customers Say</h2>
        <p className="text-center text-lg text-gray-600 mb-4 dark:text-white">Real stories from Pune. Real satisfaction.</p>

        {/* Row 1 */}
        <div className="scroll-container mb-5">
          <div className="scroll-track py-3">
            {[...testimonials, ...testimonials].map((t, i) => (
              <div key={`top-${i}`} className="testimonial-card  bg-slate-50 border border-slate-150">
                <h4 className="font-semibold text-lg flex justify-between">{t.name} <Star className="text-green-500"/></h4>
                <p className="text-sm text-gray-500 mb-3">{t.location}</p>
                <hr />
                <p className="testimonial-message">{t.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2 */}
        <div className="scroll-container mb-5">
          <div className="scroll-track reverse py-3">
            {[...testimonials, ...testimonials].map((t, i) => (
              <div key={`bottom-${i}`} className="testimonial-card  bg-slate-50 border border-slate-150">
                <h4 className="font-semibold text-lg flex justify-between">{t.name} <Star className="text-green-500"/></h4>
                <p className="text-sm text-gray-500 mb-3">{t.location}</p>
                <hr />
                <p className="testimonial-message">{t.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default InfiniteTestimonials;

import Plans from "../components/Plans"
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Brands from "../components/Brands";
import Testimonials from "../components/Testimonials"
import USP from "../components/USP";
import Navbar from "../components/Navbar"
import Footer from "../components/Footer"
import { useAuth } from '../context/AuthContext';
import ServiceCard from "../components/ServiceCard"
import { 
  Wrench, 
  
  Store,
  Zap,
  CheckCircle,
  ArrowRight,
  Calendar,

} from 'lucide-react';
import HowItWorks from "../components/HowItWorks";
 // Adjust the import path as necessary
const CustomerLanding: React.FC = () => {
  const navigate = useNavigate(); // Assuming you have a navigate function in your auth context
 const { user } = useAuth();
   const serviceList = [
    {
      icon: <Zap className="h-10 w-10" />,
      title: "Emergency Services",
      description: "Quick help when you need it most.",
      features: [
        "Bike Breakdown Assistance",
        "Chain Break Fix",
        "Puncture Repair",
        "Fuel Delivery",
        "Battery Jumpstart / Replacement",
        "Tyre Replacement",
        "Minor On-Spot Repairs",
        "Emergency Inspection Services",
        "Others (Custom Requests)"
      ],
      price: "Starting ₹199",
      
    },
    {
      icon: <Wrench className="h-10 w-10" />,
      title: "Doorstep Services",
      description: "Quality service at your home.",
      features: [
        "General Servicing",
        "Oil & Filter Change",
        "Brake Services",
        "Chain & Sprocket Check",
        "Air Filter Cleaning",
        "Electrical Checkup",
        "Tappet Adjustment",
        "Battery Health Check",
        "Clutch & Cable Adjustment",
        "Bike Wash & Polish",
         "Others (Custom Requests)"
      ],
      price: "Starting ₹299",

    },
    {
      icon: <Store className="h-10 w-10" />,
      title: "Garage Experience",
      description: "Expert repairs with advanced tools.",
      features: [
        "Advanced Diagnostics",
        "Engine Overhaul",
        "Suspension Repair",
        "Accidental Repairs",
        "Complete Bike Restoration",
        "Paint Touch-Up / Coating",
        "Parts Replacement",
        "Emission Check (PUC)",
        "Annual Maintenance Contracts (AMC)",
         "Others (Custom Requests)"
      ],
      price: "Starting ₹399",

    }
  ];

  return (
   
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
       <Navbar/>
     

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8" id='home'>
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-[43px] md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                Your Bike Our
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-green-600">
                  {" "}Service
                </span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
          Mechiee is a smart bike servicing platform offering instant, reliable, and transparent two-wheeler care — at your doorstep, in emergencies, or at trusted partner garages. Book, track, and relax — we’ve got your ride covered.
               
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                   to={user ? "/dashboard" : "/register"}
                  className="bg-gradient-to-r from-blue-400 to-green-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-blue-500 hover:to-green-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <Calendar className="h-5 w-5" />
                  <span>Book Now</span>
                </Link>
               {!user && ( <Link
                  to="/login"
                  className="border-2 border-blue-400 text-blue-600 dark:text-blue-400 px-8 py-4 rounded-lg font-semibold hover:bg-blue-400 hover:text-white transition-all duration-200 text-center"
                >
                  Sign In
                </Link>)}
              </div>

              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">100%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Satisfaction</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">24/7</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Emergency Service</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">4.9★</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Average Rating</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <img
                src="https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop"
                alt="Customer using Mechiee app"
                className="rounded-2xl shadow-2xl w-full"
              />
              <div className="absolute -top-6 -right-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Service Booked!</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Mechanic arriving in 25 min</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm" id="services">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Services We Offer
              </h3>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Three convenient ways to get your bike serviced
              </p>
            </motion.div>
          </div>

         

           <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        {serviceList.map((service, index) => (
          <motion.div
           key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
            className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-shadow duration-300 p-6 flex flex-col justify-between "
          >
            <div>
              <h2 className="text-2xl service-title mb-3 flex gap-3 font-bold">{service.icon}{service.title}</h2>
              <p className="text-gray-700 mb-3">{service.description}</p>

              <ul className="text-gray-700 text-md list-none list-inside space-y-1">
                {service.features.map((item, i) => (
                  <li key={i} className='flex items-center'> <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" /> {item}</li>
                ))}
              </ul>
            </div>

           <div className="flex items-center justify-between mt-5">
                    <span className="text-lg font-bold text-blue-600">{service.price}</span>
                    <button className="bg-gradient-to-r from-blue-400 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-500 hover:to-green-700 transition-all duration-200" onClick={() => navigate("/booking")}>
                      Book Now
                    </button>
                  </div>
          </motion.div>
        ))}
      </div>
        </div>
      </section>
<ServiceCard/>

      <Brands/>

      <HowItWorks/>

      {/* Benefits Section */}
      <USP/>

<Plans/>

      <Testimonials/>

      {/* CTA Section */}
      {
        !user && (<section className="py-20 bg-gradient-to-r from-blue-400 to-green-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-4xl font-bold text-white mb-6">
              Ready to Book Your First Service?
            </h3>
            <p className="text-blue-100 text-xl mb-8 max-w-2xl mx-auto">
              Join thousands of satisfied customers and experience hassle-free bike servicing today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <span>Create Account</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
             <Link
                to="/login"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-200"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>)
      }

      {/* Footer */}
     <Footer/>
    
    </div>
    
  );
};

export default CustomerLanding;
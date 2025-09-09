
import {motion} from "framer-motion"
import { 

  MapPin, 
  Clock, 
  CreditCard, 
  Star, 
  Smartphone,
  Shield,

} from 'lucide-react';
const USP = () => {
   const benefits = [
      {
        icon: <Smartphone className="h-8 w-8" />,
        title: "Easy Booking",
        description: "Book services in just 3 clicks through our user-friendly mobile app"
      },
      {
        icon: <MapPin className="h-8 w-8" />,
        title: "Real-time Tracking",
        description: "Track your mechanic's live location and get real-time updates"
      },
      {
        icon: <Clock className="h-8 w-8" />,
        title: "Quick Response",
        description: "Emergency services available 24/7 with average response time of 30 minutes"
      },
      {
        icon: <Shield className="h-8 w-8" />,
        title: "Trusted Mechanics",
        description: "All mechanics are verified, trained, and background-checked professionals"
      },
      {
        icon: <CreditCard className="h-8 w-8" />,
        title: "Transparent Pricing",
        description: "No hidden charges. Pay securely online with multiple payment options"
      },
      {
        icon: <Star className="h-8 w-8" />,
        title: "Quality Guarantee",
        description: "100% satisfaction guarantee with warranty on all services"
      }
    ];
  
  
  return (
    <div>
      <section className="py-20" id="about">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Customers Love Mechiee
              </h3>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Experience the difference with our customer-first approach
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div className="text-blue-500 mb-4 flex gap-3 ">{benefit.icon}               <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {benefit.title}
                </h4></div>
 
                <p className="text-gray-600 dark:text-gray-300">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default USP

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Building, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Shield,
  Smartphone,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Wrench,
  Star,

} from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

const GarageLanding: React.FC = () => {
  const benefits = [
    {
      icon: <Users className="h-8 w-8" />,
      title: "Expand Customer Base",
      description: "Reach thousands of potential customers actively looking for bike services"
    },
    {
      icon: <DollarSign className="h-8 w-8" />,
      title: "Increase Revenue",
      description: "Boost your income with our commission-based model and premium service offerings"
    },
    {
      icon: <Calendar className="h-8 w-8" />,
      title: "Manage Bookings",
      description: "Streamlined booking management system with automated scheduling"
    },
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Business Analytics",
      description: "Detailed insights and analytics to help grow your business"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Verified Platform",
      description: "Join a trusted platform with verified customers and secure payments"
    },
    {
      icon: <Smartphone className="h-8 w-8" />,
      title: "Easy Management",
      description: "Manage your garage operations from anywhere with our mobile app"
    }
  ];

  const features = [
    {
      icon: <Building className="h-12 w-12" />,
      title: "Service Management",
      description: "Create and manage your service offerings with flexible pricing",
      details: ["Custom service packages", "Dynamic pricing", "Service categories", "Availability management"]
    },
    {
      icon: <Users className="h-12 w-12" />,
      title: "Mechanic Management",
      description: "Assign and track your mechanics for optimal efficiency",
      details: ["Mechanic profiles", "Skill-based assignment", "Performance tracking", "Real-time location"]
    },
    {
      icon: <TrendingUp className="h-12 w-12" />,
      title: "Revenue Analytics",
      description: "Comprehensive business insights and revenue tracking",
      details: ["Revenue reports", "Customer analytics", "Service performance", "Growth metrics"]
    }
  ];

  const stats = [
    { number: "500+", label: "Partner Garages", icon: <Building className="h-6 w-6" /> },
    { number: "10K+", label: "Monthly Bookings", icon: <Calendar className="h-6 w-6" /> },
    { number: "₹50L+", label: "Monthly Revenue", icon: <DollarSign className="h-6 w-6" /> },
    { number: "4.8★", label: "Average Rating", icon: <Star className="h-6 w-6" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-green-400 to-green-600 p-2 rounded-lg">
                <Wrench className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mechiee</h1>
            </Link>
            
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link
                to="/login"
                className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-orange-400 to-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-orange-500 hover:to-red-700 transition-all duration-200"
              >
                Join Now
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                Grow Your
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
                  {" "}Garage Business
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Join India's largest bike service platform. Connect with thousands of customers, 
                manage your operations efficiently, and grow your revenue with Mechiee.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-orange-400 to-red-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-orange-500 hover:to-red-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <Building className="h-5 w-5" />
                  <span>Register Garage</span>
                </Link>
                <Link
                  to="/login"
                  className="border-2 border-orange-400 text-orange-600 dark:text-orange-400 px-8 py-4 rounded-lg font-semibold hover:bg-orange-400 hover:text-white transition-all duration-200"
                >
                  Partner Login
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {stats.slice(0, 2).map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className="text-orange-600">{stat.icon}</div>
                      <div className="text-2xl font-bold text-orange-600">{stat.number}</div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              <img
                src="https://images.pexels.com/photos/2116466/pexels-photo-2116466.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop"
                alt="Garage owner managing business"
                className="rounded-2xl shadow-2xl w-full"
              />
              <div className="absolute -bottom-6 -left-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Revenue Up 40%</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">This month vs last</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="text-orange-600">{stat.icon}</div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white">{stat.number}</div>
                </div>
                <div className="text-gray-600 dark:text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Powerful Tools for Your Garage
              </h3>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Everything you need to manage and grow your garage business
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="text-orange-500 mb-6">{feature.icon}</div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {feature.description}
                </p>
                
                <ul className="space-y-2">
                  {feature.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">{detail}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Why Partner with Mechiee?
              </h3>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Join hundreds of successful garage owners who've grown their business with us
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
                <div className="text-orange-500 mb-4">{benefit.icon}</div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {benefit.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-300">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h3 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                How It Works
              </h3>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Get started in just 3 simple steps
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Register Your Garage",
                description: "Sign up and complete your garage profile with services and pricing"
              },
              {
                step: "2",
                title: "Get Verified",
                description: "Complete KYC verification and add your mechanics to the platform"
              },
              {
                step: "3",
                title: "Start Earning",
                description: "Receive bookings, manage services, and grow your revenue"
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {step.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-300">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-400 to-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-4xl font-bold text-white mb-6">
              Ready to Grow Your Garage Business?
            </h3>
            <p className="text-orange-100 text-xl mb-8 max-w-2xl mx-auto">
              Join the Mechiee partner network and start earning more with India's leading bike service platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-white text-orange-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <span>Register Now</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-orange-600 transition-all duration-200"
              >
                Partner Login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Link to="/" className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-r from-green-400 to-green-600 p-2 rounded-lg">
                  <Wrench className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-xl font-bold">Mechiee</h4>
              </Link>
              <p className="text-gray-400">
                Empowering garage owners to grow their business.
              </p>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">For Partners</h5>
              <ul className="space-y-2 text-gray-400">
                <li>Partner Dashboard</li>
                <li>Service Management</li>
                <li>Revenue Analytics</li>
                <li>Support Center</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Resources</h5>
              <ul className="space-y-2 text-gray-400">
                <li>Partner Guide</li>
                <li>Best Practices</li>
                <li>Training Materials</li>
                <li>API Documentation</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Contact</h5>
              <ul className="space-y-2 text-gray-400">
                <li>partners@mechiee.com</li>
                <li>+91 9876543210</li>
                <li>Partner Support</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Mechiee. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GarageLanding;
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  MapPin, 
  Clock, 
  DollarSign, 
  Star,
  Smartphone,
  Shield,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Calendar,
  Navigation,
  Award
} from 'lucide-react';
import ThemeToggle from '../ThemeToggle';

const MechanicLanding: React.FC = () => {
  const benefits = [
    {
      icon: <DollarSign className="h-8 w-8" />,
      title: "Earn More",
      description: "Competitive pay rates with performance bonuses and tips from satisfied customers"
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Flexible Hours",
      description: "Choose your working hours and availability to maintain work-life balance"
    },
    {
      icon: <MapPin className="h-8 w-8" />,
      title: "Work Nearby",
      description: "Get jobs in your preferred locations and reduce travel time"
    },
    {
      icon: <Smartphone className="h-8 w-8" />,
      title: "Easy Job Management",
      description: "Manage all your jobs through our intuitive mobile app"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Insurance Coverage",
      description: "Comprehensive insurance coverage for work-related incidents"
    },
    {
      icon: <Award className="h-8 w-8" />,
      title: "Skill Development",
      description: "Regular training programs to enhance your technical skills"
    }
  ];

  const features = [
    {
      icon: <Navigation className="h-12 w-12" />,
      title: "Smart Job Matching",
      description: "Get matched with jobs based on your skills and location",
      details: ["Skill-based matching", "Location optimization", "Job preferences", "Real-time notifications"]
    },
    {
      icon: <Calendar className="h-12 w-12" />,
      title: "Schedule Management",
      description: "Manage your availability and schedule efficiently",
      details: ["Flexible scheduling", "Availability control", "Job calendar", "Time tracking"]
    },
    {
      icon: <TrendingUp className="h-12 w-12" />,
      title: "Earnings Tracking",
      description: "Track your earnings and performance metrics",
      details: ["Daily earnings", "Performance stats", "Customer ratings", "Bonus tracking"]
    }
  ];

  const stats = [
    { number: "2000+", label: "Active Mechanics", icon: <Wrench className="h-6 w-6" /> },
    { number: "₹25K", label: "Avg Monthly Earning", icon: <DollarSign className="h-6 w-6" /> },
    { number: "4.8★", label: "Average Rating", icon: <Star className="h-6 w-6" /> },
    { number: "95%", label: "Job Satisfaction", icon: <CheckCircle className="h-6 w-6" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
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
                className="text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-gradient-to-r from-purple-400 to-purple-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-500 hover:to-purple-700 transition-all duration-200"
              >
                Apply Now
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
                Earn More as a
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">
                  {" "}Bike Mechanic
                </span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                Join India's largest network of professional bike mechanics. Work flexibly, 
                earn more, and build your career with Mechiee's trusted platform.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-purple-400 to-purple-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-purple-500 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <Wrench className="h-5 w-5" />
                  <span>Apply as Mechanic</span>
                </Link>
                <Link
                  to="/login"
                  className="border-2 border-purple-400 text-purple-600 dark:text-purple-400 px-8 py-4 rounded-lg font-semibold hover:bg-purple-400 hover:text-white transition-all duration-200"
                >
                  Mechanic Login
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {stats.slice(0, 2).map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <div className="text-purple-600">{stat.icon}</div>
                      <div className="text-2xl font-bold text-purple-600">{stat.number}</div>
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
                src="https://images.pexels.com/photos/2116468/pexels-photo-2116468.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop"
                alt="Professional bike mechanic at work"
                className="rounded-2xl shadow-2xl w-full"
              />
              <div className="absolute -top-6 -right-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">₹2,500 Earned</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Today's earnings</p>
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
                  <div className="text-purple-600">{stat.icon}</div>
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
                Tools Built for Mechanics
              </h3>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Everything you need to manage your work efficiently
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
                <div className="text-purple-500 mb-6">{feature.icon}</div>
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
                Why Choose Mechiee?
              </h3>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Join thousands of mechanics who've transformed their careers with us
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
                <div className="text-purple-500 mb-4">{benefit.icon}</div>
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
                Start earning in just 3 simple steps
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Apply & Get Verified",
                description: "Submit your application with experience details and get verified by our team"
              },
              {
                step: "2",
                title: "Complete Training",
                description: "Complete our certification program and learn about our quality standards"
              },
              {
                step: "3",
                title: "Start Working",
                description: "Get matched with jobs, complete services, and start earning immediately"
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
                <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
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

      {/* Requirements */}
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
                Requirements
              </h3>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                What you need to join our mechanic network
              </p>
            </motion.div>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {[
                "2+ years of bike repair experience",
                "Own basic tools and equipment",
                "Valid driving license",
                "Smartphone with internet",
                "Professional attitude",
                "Good communication skills",
                "Willingness to learn",
                "Background verification"
              ].map((requirement, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center space-x-3"
                >
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300">{requirement}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-400 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-4xl font-bold text-white mb-6">
              Ready to Start Your Journey?
            </h3>
            <p className="text-purple-100 text-xl mb-8 max-w-2xl mx-auto">
              Join the Mechiee mechanic network and take your career to the next level. 
              Start earning more today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-white text-purple-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <span>Apply Now</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/login"
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-all duration-200"
              >
                Mechanic Login
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
                Empowering mechanics to build successful careers.
              </p>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">For Mechanics</h5>
              <ul className="space-y-2 text-gray-400">
                <li>Mechanic App</li>
                <li>Earnings Tracker</li>
                <li>Training Center</li>
                <li>Support</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Resources</h5>
              <ul className="space-y-2 text-gray-400">
                <li>Getting Started</li>
                <li>Best Practices</li>
                <li>Safety Guidelines</li>
                <li>FAQ</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-semibold mb-4">Contact</h5>
              <ul className="space-y-2 text-gray-400">
                <li>mechanics@mechiee.com</li>
                <li>+91 9876543210</li>
                <li>Mechanic Support</li>
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

export default MechanicLanding;
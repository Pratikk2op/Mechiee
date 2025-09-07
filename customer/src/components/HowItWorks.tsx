import React from 'react';
import {Link} from "react-router-dom"
import { Smartphone, Search, Calendar, Wrench, Star,ArrowBigRight } from 'lucide-react';
import { useAuth } from './../context/AuthContext';
const HowItWorks: React.FC = () => {
  const { user} = useAuth();

  const steps = [
    {
      step: 1,
      title: 'Book Service',
      description: 'Choose your service type and schedule a convenient time slot',
      icon: Smartphone,
      color: 'primary',
    },
    {
      step: 2,
      title: 'Find Garage',
      description: 'We match you with the best verified garage in your area',
      icon: Search,
      color: 'secondary',
    },
    {
      step: 3,
      title: 'Schedule',
      description: 'Confirm your booking and get ready for professional service',
      icon: Calendar,
      color: 'success',
    },
    {
      step: 4,
      title: 'Service',
      description: 'Expert mechanics service your bike with genuine parts',
      icon: Wrench,
      color: 'warning',
    },
    {
      step: 5,
      title: 'Review',
      description: 'Rate your experience and help us improve our service',
      icon: Star,
      color: 'error',
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return { bg: 'bg-primary-500', light:'bg-primary-100', text:'text-primary-600' };
      case 'secondary':
        return { bg: 'bg-secondary-500', light: 'bg-secondary-100', text: 'text-secondary-600' };
      case 'success':
        return { bg: 'bg-success-500', light: 'bg-success-100', text: 'text-success-600' };
      case 'warning':
        return { bg: 'bg-warning-500', light: 'bg-warning-100', text: 'text-warning-600' };
      case 'error':
        return { bg: 'bg-error-500', light: 'bg-error-100', text: 'text-error-600' };
      default:
        return { bg: 'bg-gray-500', light: 'bg-gray-100', text: 'text-gray-600' };
    }
  };

  return (
    <section className="py-20 bg-white dark:bg-gray-800/50 dark:text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 dark:text-white">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed dark:text-white">
            Getting your bike serviced has never been easier. Follow these simple steps to book professional service.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
         

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {steps.map((step, index) => {
              const IconComponent = step.icon;
              const colors = getColorClasses(step.color);

              return (
                <div key={step.step} className="relative text-center">
                  {/* Step Number */}
                  <div className={`w-16 h-16 ${colors.bg} rounded-full flex items-center justify-center mx-auto mb-6 relative z-10 shadow-lg`}>
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>

                  {/* Step Counter */}
                 {step.step!=5? <div className="absolute top-[20px] -right-1 w-8 h-8  text-white rounded-full flex items-center justify-center text-sm font-bold z-20">
<ArrowBigRight className="text-green-500 hidden md:block"/>
                
                  </div>:""}

                  {/* Content */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed dark:text-white">
                      {step.description}
                    </p>
                  </div>

                  {/* Mobile Connection Line */}
                
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-orange-600 rounded-2xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Ready to Get Started?</h3>
            <p className="text-lg mb-6 text-blue-100">
              Join thousands of satisfied customers who trust BikeCare for their two-wheeler maintenance.
            </p>
<Link  to={user ? "/booking" : "/register/customer"}>            <button className="bg-white  text-green-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors shadow-lg">
              Book Your First Service
            </button></Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

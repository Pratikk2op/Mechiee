
import {
  Phone,
  Mail,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
} from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white" id='contact'>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Company Info */}
          <div>
            <h2 className="text-3xl font-bold mb-4">Mechiee</h2>
            <p className="text-gray-400 text-sm leading-relaxed max-w-md text-justify">
              Your trusted partner for professional two-wheeler servicing. We connect riders with verified garages across the city for reliable service experiences.
            </p>
          </div>

          {/* Quick Links + Contact Us */}
          <div className="lg:col-span-2 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full ">
              {/* Quick Links */}
              <div>
             
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                  <ul className="space-y-2 text-sm">
                    <li><a href="/#home" className="hover:text-green-400 transition">Home</a></li>
                    <li><a href="/#about" className="hover:text-green-400 transition">About</a></li>
                    <li><a href="/#services" className="hover:text-green-400 transition">Services</a></li>
                  </ul>
                  <ul className="space-y-2 text-sm">
                    <li><a href="/#testimonials" className="hover:text-green-400 transition">Testimonials</a></li>
                    <li><a href="/#plans" className="hover:text-green-400 transition">Plans</a></li>
                    <li><a href="/#contact" className="hover:text-green-400 transition">Contact Us</a></li>
                  </ul>
                </div>
              </div>

              {/* Contact Us */}
              <div className="text-sm">
                <h3 className="text-lg font-semibold mb-3">Contact Us</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Phone className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <a href="tel:+918149297982" className="hover:text-green-400 transition break-all">
                      +91 8149297982
                    </a>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Mail className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <a href="mailto:mechieeservices@gmail.com" className="hover:text-green-400 transition break-all">
                      mechieeservices@gmail.com
                    </a>
                  </div>
                  <div className="flex space-x-4 pt-2">
                    <a href="#" className="text-gray-400 hover:text-white transition" aria-label="Facebook">
                      <Facebook className="w-5 h-5" />
                    </a>
                    <a href="#" className="text-gray-400 hover:text-white transition" aria-label="Twitter">
                      <Twitter className="w-5 h-5" />
                    </a>
                    <a href="https://www.instagram.com/mechiee_services?utm_source=qr&igsh=b2RidmlyZW9qeTRr" className="text-gray-400 hover:text-white transition" aria-label="Instagram">
                      <Instagram className="w-5 h-5" />
                    </a>
                    <a href="#" className="text-gray-400 hover:text-white transition" aria-label="LinkedIn">
                      <Linkedin className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <hr className="my-10 border-gray-700" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <p>©2025 Mechiee. All rights reserved.</p>
          <div className="flex flex-wrap justify-center md:justify-end space-x-6">
            <a href="/privacy" className="hover:text-white transition">Privacy Policy</a>
            <a href="/terms" className="hover:text-white transition">Terms of Service</a>
            <a href="/cookies" className="hover:text-white transition">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

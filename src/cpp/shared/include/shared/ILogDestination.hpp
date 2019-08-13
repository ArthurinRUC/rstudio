/*
 * ILogDestination.hpp
 * 
 * Copyright (C) 2019 by RStudio, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
 * Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
 * WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

#ifndef SHARED_I_LOG_DESTINATION_HPP
#define SHARED_I_LOG_DESTINATION_HPP

#include <boost/noncopyable.hpp>

#include <string>

#include "Logger.hpp"


namespace rstudio {
namespace shared {

/**
 * @brief Interface which allows a logger to write a log message to a destination.
 *
 * Log destinations IDs 0 - 100 are reserved for SDK provided log destinations.
 */
class ILogDestination : boost::noncopyable
{
public:
   /**
    * @brief Virtual destructor to allow for inheritance.
    */
    virtual ~ILogDestination() = default;

   /**
    * @brief Gets the unique ID of the log destination.
    *
    * @return The unique ID of the log destination.
    */
   virtual unsigned int getId() const = 0;

   /**
    * @brief Writes a message to this log destination.
    *
    * @param in_logLevel    The log level of the message to write. Filtering is done prior to this call. This is for
    *                       informational purposes only.
    * @param in_message     The message to write to the destination.
    */
   virtual void writeLog(LogLevel in_level, const std::string& in_message) = 0;
};

} // namespace shared
} // namespace rstudio

#endif

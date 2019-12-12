/*
 * FindResult.java
 *
 * Copyright (C) 2009-19 by RStudio, Inc.
 *
 * Unless you have received this program directly from RStudio pursuant
 * to the terms of a commercial license agreement with RStudio, then
 * this program is licensed to you under the terms of version 3 of the
 * GNU Affero General Public License. This program is distributed WITHOUT
 * ANY EXPRESS OR IMPLIED WARRANTY, INCLUDING THOSE OF NON-INFRINGEMENT,
 * MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE. Please refer to the
 * AGPL (http://www.gnu.org/licenses/agpl-3.0.txt) for more details.
 *
 */
package org.rstudio.studio.client.workbench.views.output.find.model;

import org.rstudio.core.client.Debug;
import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.core.client.JsArrayInteger;
import com.google.gwt.core.client.JsArrayString;
import com.google.gwt.safehtml.shared.SafeHtml;
import com.google.gwt.safehtml.shared.SafeHtmlBuilder;
import org.rstudio.core.client.Pair;
import org.rstudio.core.client.StringUtil;
import org.rstudio.core.client.JsArrayUtil;

import java.util.ArrayList;

public class FindResult extends JavaScriptObject
{
   public static native FindResult create(String file,
                                          int line,
                                          String lineValue) /*-{
      return ({
         file: file,
         line: line,
         lineValue: lineValue,
         replace: "",
         replaceIndicator: false,
         regexPreviewIndicator: false,
         errors: ""
      });
   }-*/;

   protected FindResult() {}

   public native final FindResult clone() /*-{
      return ({
         file: this.file,
         line: this.line,
         lineValue: this.lineValue,
         replaceIndicator: this.replaceIndicator,
         regexPreviewIndicator: this.regexPreviewIndicator,
         replace: this.replace,
         matchOn: this.matchOn,
         matchOff: this.matchOff,
         replaceMatchOn: this.replaceMatchOn,
         replaceMatchOff: this.replaceMatchOff,
         errors: this.errors
      });
   }-*/;

   public native final String getFile() /*-{
      return this.file;
   }-*/;

   public native final int getLine() /*-{
      return this.line;
   }-*/;

   public native final String getLineValue() /*-{
      return this.lineValue;
   }-*/;

   public native final String getReplaceValue()/*-{
      return this.replace;
   }-*/;

   public native final boolean getReplaceIndicator()/*-{
      return this.replaceIndicator;
   }-*/;

   public native final void setReplaceIndicator()/*-{
      this.replaceIndicator = true;
   }-*/;

   public native final boolean getRegexPreviewIndicator()/*-{
      return this.regexPreviewIndicator;
   }-*/;

   public native final void setRegexPreviewIndicator()/*-{
      this.regexPreviewIndicator = true;
   }-*/;

   public final ArrayList<Integer> getMatchOns()
   {
      return getJavaArray("matchOn");
   }

   public final ArrayList<Integer> getMatchOffs()
   {
      return getJavaArray("matchOff");
   }

   public final ArrayList<Integer> getReplaceMatchOns()
   {
      return getJavaArray("replaceMatchOn");
   }

   public final ArrayList<Integer> getReplaceMatchOffs()
   {
      return getJavaArray("replaceMatchOff");
   }

   public final String getErrors()
   {
      return getJavaStringArray("errors");
   }

   public final native void setReplace(String value) /*-{
      if (value)
         this.replace = value;
      else
         this.replace = "";
      this.regexPreviewIndicator = false;
   }-*/;


   public final SafeHtml getLineHTML()
   {
      SafeHtmlBuilder out = new SafeHtmlBuilder();

      // display any errors highlighted in red
      if (getRegexPreviewIndicator() &&
          !StringUtil.isNullOrEmpty(getErrors()))
      {
         out.appendHtmlConstant("<mark>");
         out.appendEscapedLines(getErrors());
         out.appendHtmlConstant("</mark>");
      }
      else // highlight found words and preview replaces
      {
         // retrieve match positions
         ArrayList<Integer> on = getMatchOns();
         ArrayList<Integer> off = getMatchOffs();
         ArrayList<Pair<Boolean, Integer>> parts = new ArrayList<Pair<Boolean, Integer>>();
   
         // replaceMatchOn/Offs exist only when previewing a regex replace
         ArrayList<Integer> replaceOn = getReplaceMatchOns();
         ArrayList<Integer> replaceOff = getReplaceMatchOffs();
         ArrayList<Pair<Boolean, Integer>> replaceParts = new ArrayList<Pair<Boolean, Integer>>();
   
         // combine the match on and match off lists into paired array lists for ease of use
         int difference = 0;
         int offset = 0;
         int previousOnVal = 0; // we need this to adjust the matches is a replace is before it
         while (on.size() + off.size() > 0)
         {
            int onVal = on.size() == 0 ? Integer.MAX_VALUE : on.get(0);
            int offVal = off.size() == 0 ? Integer.MAX_VALUE : off.get(0);
            int replaceOnVal = replaceOn.size() == 0 ? Integer.MAX_VALUE : replaceOn.get(0);
            int replaceOffVal = replaceOff.size() == 0 ? Integer.MAX_VALUE : replaceOff.get(0);
   
            if (onVal < offVal)
               parts.add(new Pair<Boolean, Integer>(true, on.remove(0) + offset));
            else
               parts.add(new Pair<Boolean, Integer>(false, off.remove(0) + offset));
   
            if (getRegexPreviewIndicator() &&
                replaceOn.size() + replaceOff.size() > 0)
            {
               if (replaceOnVal < replaceOffVal)
               {
                  if (replaceOnVal >= 0)
                     difference = offVal - onVal;
                  else
                  {
                     difference = -1;
                     Debug.logWarning("Unexpected value, offVal must be greater than onVal");
                  }
                  previousOnVal = replaceOn.get(0) + difference;
                  replaceParts.add(new Pair<Boolean, Integer>(true, (replaceOn.remove(0) + difference)));
               }
               else
               {
                  offset += (replaceOffVal - previousOnVal);
                  replaceParts.add(new Pair<Boolean, Integer>(false, (replaceOff.remove(0))));
               }
            }
         }
   
         // create html for line
         String line = getLineValue();
         String replace = getReplaceValue();

         // Use a counter to ensure tags are balanced.
         int openStrongTags = 0;
         int openEmTags = 0;
   
         for (int i = 0; i < line.length(); i++)
         {
            // when we reach a matchOn or matchOff position, apply a strong tag
            while (parts.size() > 0 && parts.get(0).second == i)
            {
               if (parts.remove(0).first)
               {
                  out.appendHtmlConstant("<strong>");
                  openStrongTags++;
               }
               else if (openStrongTags > 0)
               {
                  out.appendHtmlConstant("</strong>");
                  openStrongTags--;
                  if (!StringUtil.isNullOrEmpty(replace))
                  {
                     out.appendHtmlConstant("<em>");
                     out.appendEscaped(replace);
                     out.appendHtmlConstant("</em>");
                  }
               }
            }
            // when we reach a replaceOn or replaceOff position, apply an em tag
            while (replaceParts.size() > 0 && replaceParts.get(0).second == i)
            {
               if (replaceParts.remove(0).first)
               {
                  out.appendHtmlConstant("<em>");
                  openEmTags++;
               }
               else if (openEmTags > 0)
               {
                  out.appendHtmlConstant("</em>");
                  openEmTags--;
               }
            }
            out.append(line.charAt(i));
         }
   
         // tags may left open if they are at the end of the line
         if (openStrongTags > 1 || openEmTags > 1)
            Debug.logWarning("Unexpected number of open tags");
         while (openStrongTags > 0)
         {
            openStrongTags--;
            out.appendHtmlConstant("</strong>");
            if (!StringUtil.isNullOrEmpty(replace))
            {
               out.appendHtmlConstant("<em>");
               out.appendEscaped(getReplaceValue());
               out.appendHtmlConstant("</em>");
            }
         }
         while (openEmTags > 0)
         {
            openEmTags--;
            out.appendHtmlConstant("</em>");
         }
      }

      return out.toSafeHtml();
   }

   public final SafeHtml getLineReplaceHTML()
   {
      SafeHtmlBuilder out = new SafeHtmlBuilder();

      // display any errors highlighted in red
      if (!StringUtil.isNullOrEmpty(getErrors()))
      {
         out.appendHtmlConstant("<mark>");
         out.appendEscaped(getErrors());
         out.appendHtmlConstant("</mark>");
      }
      else // display replace values highlighted
      {
         // retrieve match positions
         ArrayList<Integer> onReplace = getReplaceMatchOns();
         ArrayList<Integer> offReplace = getReplaceMatchOffs();
   
         ArrayList<Pair<Boolean, Integer>> parts
                                         = new ArrayList<Pair<Boolean, Integer>>();

         // consolidate matches into one ArrayList
         while (onReplace.size() + offReplace.size() > 0)
         {
            int onReplaceVal = onReplace.size() == 0 ? Integer.MAX_VALUE : onReplace.get(0);
            int offReplaceVal = offReplace.size() == 0 ? Integer.MAX_VALUE : offReplace.get(0);
            if (onReplaceVal < offReplaceVal)
               parts.add(new Pair<Boolean, Integer>(true, onReplace.remove(0)));
            else
               parts.add(new Pair<Boolean, Integer>(false, offReplace.remove(0)));
         }
   
         // create html for line
         String line = getLineValue();
         // Use a counter to ensure tags are balanced.
         int openEmTags = 0;
         int openMarkTags = 0;
   
         for (int i = 0; i < line.length(); i++)
         {
            // when we reach a match position, apply an em tag
            while (parts.size() > 0 && parts.get(0).second == i)
            {
               if (parts.remove(0).first)
               {
                  out.appendHtmlConstant("<em>");
                  openEmTags++;
                  Debug.logToConsole("openEmTags: " + Integer.toString(openEmTags));
                  Debug.logToConsole("out: " + out.toSafeHtml().asString());
               }
               else if (openEmTags > 0)
               {
                  out.appendHtmlConstant("</em>");
                  openEmTags--;
               }
            }
            out.append(line.charAt(i));
         }
   
         // tags may left open if they are at the end of the line
         while (openEmTags > 0)
         {
            openEmTags--;
            out.appendHtmlConstant("</em>");
         }
      }

      return out.toSafeHtml();
   }

   private ArrayList<Integer> getJavaArray(String property)
   {
      JsArrayInteger array = getArray(property);
      ArrayList<Integer> ints = new ArrayList<Integer>();
      for (int i = 0; i < array.length(); i++)
         ints.add(array.get(i));
      return ints;
   }

   private String getJavaStringArray(String property)
   {
      JsArrayString array = getStringArray(property);
      String string = array.toString();
      return string;
   }

   private native final JsArrayInteger getArray(String property) /*-{
      if (this == null)
         return [];
      return this[property] || [];
   }-*/;

  private native final JsArrayString getStringArray(String property) /*-{
     if (this == null)
        return [];
     return this[property] || [];
  }-*/;
}

// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('validators/validator') ;

/**
  Checks to ensure that the string is within the specified number of characters
  
  @class
  @extends SC.Validator
  @author James Ribar
  @version 1.0
*/
SC.Validator.String = SC.Validator.extend(
/** @scope SC.Validator.String.prototype */ {
  
  /**
    Min Length
    
    If null, no min length
  */
  minLength: null,

  /**
    Max Length 
    
    If null, no max length
  */
  maxLength: null,
  
  validate: function(form, field) {
    var value = field.get('fieldValue'), 
        min = this.get('minLength'), 
        max = this.get('maxLength');
    if (SC.none(value) && !SC.none(max)) { return NO; }
    if (!SC.none(value.length)) { 
      if (!SC.none(max) && value.length > max) { return NO; }
      if (!SC.none(min) && value.length < min) { return NO; }
      return YES;
    }
    return YES;
  },
  
  validateError: function(form, field) {
    var label = field.get('errorLabel') || 'Field' ;
    return SC.$error(SC.String.loc("Invalid.String(%@)", SC.String.capitalize(label)), field.get('errorLabel'));
  },
  
  /** 
    Allow only if we're not at or over max length
  */
  validateKeyDown: function(form, field, charStr) {
    if(!charStr) charStr = "";
    var text = field.$input().val();
    if (!text) text='';
    text+=charStr;

    if (SC.none(this.get('maxLength'))) return YES;
    if (text.length > this.get('maxLength')) return NO;
    return YES;
  }
    
}) ;

#Preprocess
----

###Description

The preprocess folder is where you'll create your .less or .sass styles.

These files will be compiled and output to /public/css using the filename you've provided.

For example theme.less will become /public/css/theme.css.

Note only the top level of this folder will be processed. 

This enabled creating multiple styles while using @import.

###Example

/assets
    /preprocess
        /base (this is the base folder which contains files that base.less will import)
            /layout.less
            /alerts.less
            /mixins.less            
        /base.less (this is our base stylesheet)
        /theme.less (some styles in theme override base)
        

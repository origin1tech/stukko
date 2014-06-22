#Preprocess
----

###Description

The preprocess folder is where you'll create your .less or .sass styles. These files will be compiled and 
output to /public/css using the filename you've provided.

For example default.less will become /public/css/theme.css.

###Oraganizing Files

It is important to note that if linking is enabled it is good practice to exclude any file in the root of preprocess.
You do this in your configuration options under link.common.exclude. In this array create glob that would exclude
the file so that you can conversely include it in the link.application.files array. 

To exclude a file you would simply add a '!' in front of the path. For example if you want to exclude the default.less
file or main theme file it would look like:

````
link: {
    common: {
        exclude: ['!./web/public/css/base.css']
    }
}
````

This is because you'll likely want these files injected in the "application" section of your injected or linked
files. That way any minified or mixin css files will be loaded before your application files thereby allowing your
application or main css files for a lack of a better term, override the common files. 

###Theme Example

**base.less - our base for all themes, not required but this is what we like!

````
header { /* some header styles */ }
#main { /* our main content styles */ }
footer { /* footer styles */ }
````

**default.less - this is our default theme, you might have a blue.less or orange.less and so on, you get the idea.

````
@import url('base.less'); /* this imports our base styling so we can override as needed */
@import url('themes/default/variables'); /* this would import support files in this case a less file for variables */

header { height: 50px; position: fixed; width: 100%;  }
#main { padding-top: 50px; }
footer { height: 40px; background-color: #333333; color: #ffffff; }
````

In the above both base.less and variables would be imported into default.less


###Stucture Example

/assets
    /preprocess
        base.less               this is the base file which contains your primary layout styling.
        default.less            this is your default theme which will include the above base.less
        /themes                 folders of each theme by name. example default.less would have /theme/default.
            /default            the theme folder which matches a theme in the root of preprocess.
                variables.less  a support file for variables which we'll import to default.less.
            
            
       
        

#Current System (Systeme.io + backend server to process xendit payments + shopify + facebook community)

## System.io does this for us:
EMAIL
- they have email marketing (allows our admins to create email campaigns and highly customized workflows/pipeline for customers. )
- customized welcome email for all people who enroll in the course.
- custom triggers for email automation (when people are tagged by a certain tag, when they're done with the course, etc. )
LMS
- membership creation and logins for students in the course
- members can edit their profiles
- view/replay courses enrolled. 
- comment on the actual lesson page
- creation of courses / lessons
- embedding of vimeo videos in the lessons page
- drag and drop editor for lessons page
Site
- landing pages and offer pages
- create and sell courses
- create and sell tiered memberships

## Shopify
- there's a shopify store that's linked on a subdomain from our systeme.io website. that's a shopify store created in shopify. we're selling commercial licenses tehre exclusive to students enrolled. we just give them a site password. 

-----------

## We want:
- membership site that's filtered according to membership
- students should be able to see courses they are enrolled to. 
- students should also be able to see all the products that they have purchased
- students should have like a facebook interface community where they can post/share stuff. 
Or better yet, if we can integrate facebook groups (although i'm not sure if that's still allowed. facebook limited their api)
- An admin should be able to manage all of these LMS stuff.
- we also want a custom xendit checkout, instead of relying on xendit's invoice. that way we can fully customize the checkout page. 
- and then we want to integrate the shopify store using shopify api so we can maintain the brand look and feel. we'll setup a public store and a members only store. 
- then we want a dashboard that can track:
- enrollements, sign ups, products sold. 
- integrate facebook api to see if we can measure ads to site visit conversions, so we can see which ad brings people in our website to sign up/ enroll
- monitor site actions so we can improve UI/UX and conversions. 

I understand that some of these things can be coded into the site. However we also need to think about what parts of the site can be managed by an admin so they don't have to call the dev on every single thing. I think :
- email marketing should be available
- management of community and courses and lessons
- management of users 
- dashboard

We also need to think that all of this will be built by an AI with limited context windows. 
So we have to be careful that 
1. It's modular and small and broken down into small parts as much as possible. 
2. Some form of guideline to maintain global coherence of the full site. 
3. Is thinking of site-wide implementations valid? if yes, how will we make sure this happens?
4. Maintain look and feel, and best industry practices. 
-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.comment_likes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  comment_id bigint NOT NULL,
  user_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comment_likes_pkey PRIMARY KEY (id),
  CONSTRAINT comment_likes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(comment_id),
  CONSTRAINT comment_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.comments (
  comment_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  post_id bigint NOT NULL,
  farmer_id bigint NOT NULL,
  text text NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  parent_comment_id bigint,
  CONSTRAINT comments_pkey PRIMARY KEY (comment_id),
  CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT comments_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmer(id),
  CONSTRAINT comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.comments(comment_id)
);
CREATE TABLE public.conversation_participants (
  id bigint NOT NULL DEFAULT nextval('conversation_participants_id_seq'::regclass),
  conversation_id bigint NOT NULL,
  farmer_id bigint NOT NULL,
  role text DEFAULT 'member'::text,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversation_participants_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT conversation_participants_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.conversations (
  id bigint NOT NULL DEFAULT nextval('conversations_id_seq'::regclass),
  is_group boolean DEFAULT false,
  title text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.crop_ai_data (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  crop_id bigint,
  germination_start date,
  germination_end date,
  seedling_start date,
  seedling_end date,
  vegetative_start date,
  vegetative_end date,
  flowering_start date,
  flowering_end date,
  fruiting_start date,
  fruiting_end date,
  harvest_start date,
  harvest_end date,
  irrigation text,
  fertilizer text,
  care_tips text,
  created_at timestamp without time zone DEFAULT now(),
  timeline_items jsonb,
  CONSTRAINT crop_ai_data_pkey PRIMARY KEY (id),
  CONSTRAINT crop_ai_data_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.crops(id)
);
CREATE TABLE public.crop_tasks (
  id bigint NOT NULL DEFAULT nextval('crop_tasks_id_seq'::regclass),
  farmer_id bigint NOT NULL,
  crop_id bigint NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  description text,
  priority text DEFAULT 'low'::text,
  status text DEFAULT 'open'::text,
  due_date timestamp with time zone,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT crop_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT crop_tasks_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.crops(id),
  CONSTRAINT crop_tasks_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.crops (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  farmer_id bigint,
  name text NOT NULL,
  plant_type text,
  planting_date date NOT NULL,
  soil_type text,
  plant_location text,
  image_url text,
  stage text,
  progress integer DEFAULT 0,
  humidity text,
  water_in text,
  fert_in text,
  created_at timestamp without time zone DEFAULT now(),
  water_every_days integer DEFAULT 2,
  last_watered_at timestamp with time zone,
  last_soil_check_at timestamp with time zone,
  CONSTRAINT crops_pkey PRIMARY KEY (id),
  CONSTRAINT crops_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.expert_chat_purchases (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  buyer_id bigint NOT NULL,
  expert_farmer_id bigint NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'paid'::text CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'cancelled'::text, 'refunded'::text])),
  paid_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expert_chat_purchases_pkey PRIMARY KEY (id),
  CONSTRAINT expert_chat_purchases_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.farmer(id),
  CONSTRAINT expert_chat_purchases_expert_farmer_id_fkey FOREIGN KEY (expert_farmer_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.expert_verification_documents (
  id bigint NOT NULL DEFAULT nextval('expert_verification_documents_id_seq'::regclass),
  request_id bigint NOT NULL,
  doc_type text NOT NULL CHECK (doc_type = ANY (ARRAY['degree'::text, 'certificate'::text, 'license'::text])),
  file_url text NOT NULL,
  file_name text,
  mime_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT expert_verification_documents_pkey PRIMARY KEY (id),
  CONSTRAINT expert_verification_documents_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.expert_verification_requests(id)
);
CREATE TABLE public.expert_verification_requests (
  id bigint NOT NULL DEFAULT nextval('expert_verification_requests_id_seq'::regclass),
  farmer_id bigint NOT NULL,
  expertise_field text NOT NULL,
  years_of_experience integer NOT NULL CHECK (years_of_experience >= 1),
  notes text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  reviewed_by bigint,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT expert_verification_requests_pkey PRIMARY KEY (id),
  CONSTRAINT expert_verification_requests_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmer(id),
  CONSTRAINT expert_verification_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.farmer(id)
);
CREATE TABLE public.experts (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  farmer_id bigint UNIQUE,
  specialization text NOT NULL,
  certificate_url text,
  experience_years integer,
  chat_price numeric DEFAULT 0,
  status text DEFAULT 'pending'::text,
  approved_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT experts_pkey PRIMARY KEY (id),
  CONSTRAINT experts_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.farmer (
  id integer NOT NULL DEFAULT nextval('farmer_id_seq'::regclass),
  name character varying NOT NULL,
  password character varying NOT NULL,
  city character varying NOT NULL,
  village character varying,
  email character varying NOT NULL UNIQUE,
  avatar character varying,
  bio text,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'banned'::text])),
  is_expert boolean NOT NULL DEFAULT false,
  expert_verified boolean NOT NULL DEFAULT false,
  expert_verified_at timestamp with time zone,
  expert_field text,
  expert_years integer,
  role text DEFAULT 'farmer'::text,
  is_verified boolean DEFAULT false,
  verified_at timestamp with time zone,
  last_active_at timestamp with time zone,
  CONSTRAINT farmer_pkey PRIMARY KEY (id)
);
CREATE TABLE public.followers (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  follower_id bigint NOT NULL,
  following_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT followers_pkey PRIMARY KEY (id),
  CONSTRAINT followers_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.farmer(id),
  CONSTRAINT followers_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.follows (
  id integer NOT NULL DEFAULT nextval('follows_id_seq'::regclass),
  follower_id integer,
  following_id integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT follows_pkey PRIMARY KEY (id),
  CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.farmer(id),
  CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.likes (
  id integer NOT NULL DEFAULT nextval('likes_id_seq'::regclass),
  farmer_id integer,
  target_type character varying NOT NULL,
  target_id integer NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT likes_pkey PRIMARY KEY (id),
  CONSTRAINT likes_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.messages (
  id bigint NOT NULL DEFAULT nextval('messages_id_seq'::regclass),
  conversation_id bigint NOT NULL,
  sender_id bigint NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.notifications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  farmer_id bigint,
  crop_id bigint,
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  type text DEFAULT 'stage_update'::text,
  is_read boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmer(id),
  CONSTRAINT notifications_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.crops(id)
);
CREATE TABLE public.poll_choices (
  id integer NOT NULL DEFAULT nextval('poll_choices_id_seq'::regclass),
  poll_id integer,
  choice_text character varying NOT NULL,
  votes_count integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT poll_choices_pkey PRIMARY KEY (id),
  CONSTRAINT poll_choices_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id)
);
CREATE TABLE public.poll_votes (
  id integer NOT NULL DEFAULT nextval('poll_votes_id_seq'::regclass),
  poll_id integer,
  choice_id integer,
  farmer_id integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT poll_votes_pkey PRIMARY KEY (id),
  CONSTRAINT poll_votes_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id),
  CONSTRAINT poll_votes_choice_id_fkey FOREIGN KEY (choice_id) REFERENCES public.poll_choices(id),
  CONSTRAINT poll_votes_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.polls (
  id integer NOT NULL DEFAULT nextval('polls_id_seq'::regclass),
  post_id integer,
  title character varying NOT NULL,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT polls_pkey PRIMARY KEY (id),
  CONSTRAINT polls_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id)
);
CREATE TABLE public.post_likes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  post_id bigint NOT NULL,
  user_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT post_likes_pkey PRIMARY KEY (id),
  CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id),
  CONSTRAINT post_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.posts (
  id integer NOT NULL DEFAULT nextval('posts_id_seq'::regclass),
  author_id integer,
  content text NOT NULL,
  media_url character varying,
  media_type character varying,
  location_name character varying,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  shares_count integer DEFAULT 0,
  original_post_id integer,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  poll_id bigint,
  location text,
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_farmer_id_fkey FOREIGN KEY (author_id) REFERENCES public.farmer(id),
  CONSTRAINT posts_original_post_id_fkey FOREIGN KEY (original_post_id) REFERENCES public.posts(id),
  CONSTRAINT posts_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id)
);
CREATE TABLE public.product_answers (
  id bigint NOT NULL DEFAULT nextval('product_answers_id_seq'::regclass),
  question_id bigint NOT NULL,
  responder_id bigint NOT NULL,
  answer_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_answers_pkey PRIMARY KEY (id),
  CONSTRAINT product_answers_question_fk FOREIGN KEY (question_id) REFERENCES public.product_questions(id),
  CONSTRAINT product_answers_responder_fk FOREIGN KEY (responder_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.product_questions (
  id bigint NOT NULL DEFAULT nextval('product_questions_id_seq'::regclass),
  product_id bigint NOT NULL,
  asker_id bigint NOT NULL,
  question_text text NOT NULL,
  visibility text NOT NULL DEFAULT 'public'::text CHECK (visibility = ANY (ARRAY['public'::text, 'private'::text])),
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'answered'::text, 'closed'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_questions_pkey PRIMARY KEY (id),
  CONSTRAINT product_questions_product_fk FOREIGN KEY (product_id) REFERENCES public.store_items(id),
  CONSTRAINT product_questions_asker_fk FOREIGN KEY (asker_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.store_cart (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id bigint NOT NULL,
  item_id bigint NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT store_cart_pkey PRIMARY KEY (id),
  CONSTRAINT store_cart_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.farmer(id),
  CONSTRAINT store_cart_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.store_items(id)
);
CREATE TABLE public.store_items (
  id bigint NOT NULL DEFAULT nextval('store_items_id_seq'::regclass),
  farmer_id bigint NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  price numeric NOT NULL,
  tag text NOT NULL,
  location text NOT NULL,
  image_url text,
  stock integer DEFAULT 1,
  delivery_available boolean DEFAULT true,
  rating numeric DEFAULT 0,
  reviews_count integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  is_rentable boolean DEFAULT false,
  rent_price_per_day numeric,
  max_rent_days integer DEFAULT 30,
  price_unit text DEFAULT 'item'::text,
  CONSTRAINT store_items_pkey PRIMARY KEY (id),
  CONSTRAINT store_items_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.store_order_items (
  id bigint NOT NULL DEFAULT nextval('store_order_items_id_seq'::regclass),
  order_id bigint NOT NULL,
  item_id bigint NOT NULL,
  quantity integer NOT NULL,
  price_each numeric NOT NULL,
  CONSTRAINT store_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT store_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.store_orders(id),
  CONSTRAINT store_order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.store_items(id)
);
CREATE TABLE public.store_order_status_history (
  id integer NOT NULL DEFAULT nextval('store_order_status_history_id_seq'::regclass),
  order_id integer NOT NULL,
  status character varying NOT NULL,
  changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  changed_by character varying DEFAULT 'seller'::character varying,
  CONSTRAINT store_order_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT store_order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.store_orders(id)
);
CREATE TABLE public.store_orders (
  id bigint NOT NULL DEFAULT nextval('store_orders_id_seq'::regclass),
  buyer_id bigint NOT NULL,
  total_price numeric NOT NULL,
  payment_method text NOT NULL,
  status text DEFAULT 'pending'::text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT store_orders_pkey PRIMARY KEY (id),
  CONSTRAINT store_orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.store_rental_status_history (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  rental_id bigint NOT NULL,
  status text NOT NULL,
  changed_at timestamp without time zone DEFAULT now(),
  changed_by text DEFAULT 'seller'::text,
  CONSTRAINT store_rental_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT store_rental_status_history_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.store_rentals(id)
);
CREATE TABLE public.store_rentals (
  id bigint NOT NULL DEFAULT nextval('store_rentals_id_seq'::regclass),
  renter_id bigint NOT NULL,
  item_id bigint NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_cost numeric NOT NULL,
  status text DEFAULT 'active'::text,
  created_at timestamp without time zone DEFAULT now(),
  returned_at timestamp without time zone,
  late boolean DEFAULT false,
  late_fee numeric DEFAULT 0,
  damage_note text,
  damage_fee numeric DEFAULT 0,
  CONSTRAINT store_rentals_pkey PRIMARY KEY (id),
  CONSTRAINT store_rentals_renter_id_fkey FOREIGN KEY (renter_id) REFERENCES public.farmer(id),
  CONSTRAINT store_rentals_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.store_items(id)
);
CREATE TABLE public.tasks (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  farmer_id bigint NOT NULL,
  crop_id bigint,
  title text NOT NULL,
  description text,
  type text DEFAULT 'general'::text,
  priority text DEFAULT 'medium'::text,
  progress integer DEFAULT 0,
  completed boolean DEFAULT false,
  due_date timestamp without time zone,
  ai_reason text,
  weather_json jsonb,
  crop_stage text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmer(id),
  CONSTRAINT tasks_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.crops(id)
);
CREATE TABLE public.user_reports (
  id bigint NOT NULL DEFAULT nextval('user_reports_id_seq'::regclass),
  reporter_id bigint NOT NULL,
  target_type text NOT NULL CHECK (target_type = ANY (ARRAY['user'::text, 'post'::text, 'item'::text])),
  target_id bigint NOT NULL,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'reviewing'::text, 'resolved'::text, 'dismissed'::text])),
  admin_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT user_reports_pkey PRIMARY KEY (id),
  CONSTRAINT user_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.farmer(id)
);
CREATE TABLE public.verification_documents (
  id bigint NOT NULL DEFAULT nextval('verification_documents_id_seq'::regclass),
  request_id bigint NOT NULL,
  doc_type text NOT NULL,
  file_url text NOT NULL,
  file_name text,
  mime_type text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT verification_documents_pkey PRIMARY KEY (id),
  CONSTRAINT verification_documents_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.verification_requests(id)
);
CREATE TABLE public.verification_requests (
  id bigint NOT NULL DEFAULT nextval('verification_requests_id_seq'::regclass),
  farmer_id bigint NOT NULL,
  expertise_field text NOT NULL,
  years_experience integer NOT NULL CHECK (years_experience >= 1),
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  reviewed_by bigint,
  reviewed_at timestamp with time zone,
  admin_note text,
  CONSTRAINT verification_requests_pkey PRIMARY KEY (id),
  CONSTRAINT verification_requests_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.farmer(id),
  CONSTRAINT verification_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.farmer(id)
);

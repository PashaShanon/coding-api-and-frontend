--
-- PostgreSQL database dump
--

\restrict KcPQpJ8nHd6qSurUgd2sfzZ1OVDb3U3aVpv4I5Nc4luuVomwPCR1q5n9bBGblWc

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

-- Started on 2025-11-17 08:50:17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 2 (class 3079 OID 19015)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 5013 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 241 (class 1255 OID 19139)
-- Name: generate_transaction_code(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_transaction_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN 'TRX-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(nextval('transactions_id_seq')::TEXT, 6, '0');
END;
$$;


ALTER FUNCTION public.generate_transaction_code() OWNER TO postgres;

--
-- TOC entry 240 (class 1255 OID 19134)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 221 (class 1259 OID 19046)
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 19045)
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- TOC entry 5014 (class 0 OID 0)
-- Dependencies: 220
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- TOC entry 225 (class 1259 OID 19084)
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    transaction_code character varying(50) NOT NULL,
    user_id integer NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    payment_method character varying(50) DEFAULT 'cash'::character varying,
    status character varying(20) DEFAULT 'completed'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transactions_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['cash'::character varying, 'debit'::character varying, 'credit'::character varying, 'transfer'::character varying])::text[]))),
    CONSTRAINT transactions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT transactions_total_amount_check CHECK ((total_amount >= (0)::numeric))
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 19145)
-- Name: daily_sales_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.daily_sales_summary AS
 SELECT date(created_at) AS sale_date,
    count(id) AS total_transactions,
    sum(total_amount) AS total_revenue,
    avg(total_amount) AS average_transaction_value
   FROM public.transactions t
  WHERE ((status)::text = 'completed'::text)
  GROUP BY (date(created_at))
  ORDER BY (date(created_at)) DESC;


ALTER VIEW public.daily_sales_summary OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 19060)
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    category_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_stock_check CHECK ((stock >= 0))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 19112)
-- Name: transaction_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transaction_items (
    id integer NOT NULL,
    transaction_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    price numeric(12,2) NOT NULL,
    subtotal numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transaction_items_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT transaction_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT transaction_items_subtotal_check CHECK ((subtotal >= (0)::numeric))
);


ALTER TABLE public.transaction_items OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 19140)
-- Name: product_sales_summary; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.product_sales_summary AS
 SELECT p.id,
    p.name,
    p.price,
    p.stock,
    c.name AS category_name,
    COALESCE(sum(ti.quantity), (0)::bigint) AS total_sold,
    COALESCE(sum(ti.subtotal), (0)::numeric) AS total_revenue
   FROM (((public.products p
     LEFT JOIN public.categories c ON ((p.category_id = c.id)))
     LEFT JOIN public.transaction_items ti ON ((p.id = ti.product_id)))
     LEFT JOIN public.transactions t ON (((ti.transaction_id = t.id) AND ((t.status)::text = 'completed'::text))))
  GROUP BY p.id, p.name, p.price, p.stock, c.name
  ORDER BY COALESCE(sum(ti.subtotal), (0)::numeric) DESC;


ALTER VIEW public.product_sales_summary OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 19059)
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.products_id_seq OWNER TO postgres;

--
-- TOC entry 5015 (class 0 OID 0)
-- Dependencies: 222
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- TOC entry 226 (class 1259 OID 19111)
-- Name: transaction_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transaction_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transaction_items_id_seq OWNER TO postgres;

--
-- TOC entry 5016 (class 0 OID 0)
-- Dependencies: 226
-- Name: transaction_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transaction_items_id_seq OWNED BY public.transaction_items.id;


--
-- TOC entry 224 (class 1259 OID 19083)
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- TOC entry 5017 (class 0 OID 0)
-- Dependencies: 224
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- TOC entry 219 (class 1259 OID 19027)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'kasir'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'kasir'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 19026)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5018 (class 0 OID 0)
-- Dependencies: 218
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4788 (class 2604 OID 19049)
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- TOC entry 4791 (class 2604 OID 19063)
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- TOC entry 4801 (class 2604 OID 19115)
-- Name: transaction_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_items ALTER COLUMN id SET DEFAULT nextval('public.transaction_items_id_seq'::regclass);


--
-- TOC entry 4796 (class 2604 OID 19087)
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- TOC entry 4783 (class 2604 OID 19030)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5001 (class 0 OID 19046)
-- Dependencies: 221
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, description, created_at, updated_at) FROM stdin;
1	Kemeja	Berbagai jenis kemeja pria dan wanita	2025-10-14 08:39:59.463016	2025-10-14 08:39:59.463016
2	Kaos	Kaos casual, kaos polo, dan t-shirt	2025-10-14 08:39:59.463016	2025-10-14 08:39:59.463016
3	Celana	Celana jeans, celana formal, dan celana casual	2025-10-14 08:39:59.463016	2025-10-14 08:39:59.463016
4	Dress	Dress untuk berbagai acara	2025-10-14 08:39:59.463016	2025-10-14 08:39:59.463016
5	Jaket	Jaket dan outer wear	2025-10-14 08:39:59.463016	2025-10-14 08:39:59.463016
6	Rok	Berbagai model rok	2025-10-14 08:39:59.463016	2025-10-14 08:39:59.463016
7	Aksesoris	Topi, tas, dan aksesoris fashion lainnya	2025-10-14 08:39:59.463016	2025-10-14 08:39:59.463016
8	Test Category	This is a test category	2025-10-14 10:24:40.290545	2025-10-14 10:24:40.290545
10	sandal	Berbagai macam sandal	2025-10-14 13:20:25.458945	2025-10-14 13:23:24.646539
12	baju renang	baju renang anti air	2025-10-17 10:33:36.034396	2025-10-17 10:34:38.414022
\.


--
-- TOC entry 5003 (class 0 OID 19060)
-- Dependencies: 223
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.products (id, name, description, price, stock, category_id, is_active, created_at, updated_at) FROM stdin;
2	Kemeja Wanita Casual Biru	Kemeja casual wanita warna biru muda, cocok untuk santai	125000.00	20	1	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
5	T-Shirt Wanita Pink	T-shirt wanita warna pink dengan sablon lucu	65000.00	40	2	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
6	Kaos Oblong Putih Basic	Kaos oblong polos putih, bahan katun premium	45000.00	50	2	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
7	Kaos Lengan Panjang Hitam	Kaos lengan panjang warna hitam, nyaman dipakai	75000.00	35	2	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
9	Celana Formal Wanita	Celana formal wanita warna hitam, cocok untuk kerja	200000.00	18	3	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
11	Celana Pendek Pria	Celana pendek pria untuk santai, bahan katun	120000.00	25	3	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
13	Dress Mini Hitam	Dress mini warna hitam, simple dan elegant	180000.00	15	4	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
14	Dress Kerja Abu-abu	Dress untuk kerja warna abu-abu, professional look	195000.00	10	4	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
15	Jaket Bomber Hijau	Jaket bomber warna hijau army, trendy dan stylish	275000.00	8	5	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
16	Jaket Denim	Jaket denim klasik, cocok untuk gaya casual	225000.00	12	5	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
17	Hoodie Polos Abu-abu	Hoodie polos warna abu-abu, hangat dan nyaman	150000.00	20	5	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
19	Rok Jeans Mini	Rok jeans mini, casual dan trendy	120000.00	18	6	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
21	Topi Baseball Hitam	Topi baseball warna hitam, adjustable	50000.00	30	7	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
22	Tas Selempang Kulit	Tas selempang kulit sintetis, praktis dan stylish	180000.00	15	7	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
23	Ikat Pinggang Kulit	Ikat pinggang kulit genuine, warna coklat	85000.00	25	7	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
24	Syal Wol Abu-abu	Syal wol lembut warna abu-abu, hangat untuk musim dingin	75000.00	20	7	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.46991
4	Kaos Polo Pria Navy	Kaos polo pria warna navy, bahan cotton combed	85000.00	29	2	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.507778
8	Celana Jeans Pria Slim Fit	Celana jeans pria model slim fit, warna dark blue	250000.00	19	3	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.509062
18	Rok Plisket Hitam	Rok plisket panjang warna hitam, elegant dan feminine	140000.00	14	6	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.510371
20	Rok A-Line Coklat	Rok A-line warna coklat, cocok untuk berbagai acara	160000.00	11	6	t	2025-10-14 08:39:59.46991	2025-10-14 08:39:59.511327
25	Kemeja Formal Putih	Kemeja formal berkualitas tinggi warna putih	150000.00	25	1	t	2025-10-14 10:24:31.124707	2025-10-14 10:24:31.124707
26	Celana Jeans Slim Fit	Celana jeans dengan potongan slim fit	250000.00	15	3	t	2025-10-14 10:24:31.127281	2025-10-14 10:24:31.127281
27	Sabuk Kulit Premium	Sabuk kulit asli dengan kualitas premium	120000.00	20	7	t	2025-10-14 10:24:31.128495	2025-10-14 10:24:31.128495
28	Test Product	This is a test product	99.99	10	8	t	2025-10-14 10:24:40.314393	2025-10-14 10:24:40.314393
1	Kemeja Pria Formal Putih	Kemeja formal lengan panjang warna putih, bahan katun premium	150000.00	21	1	t	2025-10-14 08:39:59.46991	2025-10-14 13:28:25.612396
3	Kemeja Flanel Kotak-kotak	Kemeja flanel dengan motif kotak-kotak, hangat dan stylish	175000.00	5	1	t	2025-10-14 08:39:59.46991	2025-10-17 10:46:18.651449
\.


--
-- TOC entry 5007 (class 0 OID 19112)
-- Dependencies: 227
-- Data for Name: transaction_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transaction_items (id, transaction_id, product_id, quantity, price, subtotal, created_at) FROM stdin;
1	1	1	1	150000.00	150000.00	2025-10-14 08:39:59.491258
2	1	4	1	85000.00	85000.00	2025-10-14 08:39:59.491258
3	2	1	1	150000.00	150000.00	2025-10-14 08:39:59.49808
4	3	8	1	250000.00	250000.00	2025-10-14 08:39:59.499844
5	3	18	1	50000.00	50000.00	2025-10-14 08:39:59.499844
6	3	20	1	85000.00	85000.00	2025-10-14 08:39:59.499844
7	6	1	2	150000.00	300000.00	2025-10-14 13:28:25.612396
8	7	3	5	175000.00	875000.00	2025-10-17 10:42:45.580334
9	8	3	5	175000.00	875000.00	2025-10-17 10:46:18.651449
\.


--
-- TOC entry 5005 (class 0 OID 19084)
-- Dependencies: 225
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, transaction_code, user_id, total_amount, payment_method, status, notes, created_at, updated_at) FROM stdin;
1	TRX-20240114-000001	2	235000.00	cash	completed	\N	2025-10-14 08:39:59.480448	2025-10-14 08:39:59.480448
2	TRX-20240114-000002	2	150000.00	debit	completed	\N	2025-10-14 08:39:59.480448	2025-10-14 08:39:59.480448
3	TRX-20240114-000003	3	320000.00	cash	completed	\N	2025-10-14 08:39:59.480448	2025-10-14 08:39:59.480448
6	TRX-1760423305611	1	300000.00	cash	\N	\N	2025-10-14 13:28:25.612396	2025-10-14 13:29:59.238976
7	TRX-1760672565579	1	875000.00	cash	completed	\N	2025-10-17 10:42:45.580334	2025-10-17 10:42:45.580334
8	TRX-1760672778649	2	875000.00	cash	completed	\N	2025-10-17 10:46:18.651449	2025-10-17 10:46:18.651449
\.


--
-- TOC entry 4999 (class 0 OID 19027)
-- Dependencies: 219
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password, role, is_active, created_at, updated_at) FROM stdin;
3	Kasir 2	kasir2@tokopakaian.com	$2a$12$ChG6yvs9F2fvcCAWtZMVDOtbtgDwmtx60OHSABp4J639D6Dnf1Oa2	kasir	t	2025-10-14 08:39:59.44715	2025-10-14 08:39:59.44715
9	anakmagang12	anakmagang21@anjai.com	$2a$12$cqLYWKv/D9vaOVFEXpHuH./bAWyRkUHmoBp53.fUHrppxOlG./1re	kasir	f	2025-10-17 10:37:04.763008	2025-10-17 10:37:34.088273
2	Kasir 1	kasir1@tokopakaian.com	$2a$12$ChG6yvs9F2fvcCAWtZMVDOtbtgDwmtx60OHSABp4J639D6Dnf1Oa2	kasir	t	2025-10-14 08:39:59.44715	2025-10-17 10:46:04.864062
4	Demo Admin	admin@demo.com	$2a$12$SHgw2gPCJkRrcXVBdSngV.DMLAcIDmQZ1MYmjhckVxgj7qh22Yr6q	admin	t	2025-10-14 10:24:30.837152	2025-10-20 19:08:22.012742
1	Admin Toko	admin@tokopakaian.com	$2a$12$ChG6yvs9F2fvcCAWtZMVDOtbtgDwmtx60OHSABp4J639D6Dnf1Oa2	admin	t	2025-10-14 08:39:59.44715	2025-11-17 08:38:15.580376
5	Demo Kasir	kasir@demo.com	$2a$12$l5f4UfE.NUkoRs5BWGrOdO3VcDnjz9kORroZ.yNalssQ4vRo9p/LK	kasir	t	2025-10-14 10:24:31.110277	2025-10-14 10:24:31.110277
7	anak magang	anakmagang@anjai.com	$2a$12$IIyIYSBuSgghkETpY2fnROVUHxfKB6BS2aaZf8.n635CkJuz68LCW	kasir	t	2025-10-14 13:37:39.544009	2025-10-14 13:37:39.544009
8	anak magang	anakmagang2@anjai.com	$2a$12$FtnZDGFrXJn3Lj87Bqfgr.Ed57WDwl4p1erSyGzlHgcsdih6HzZeS	kasir	f	2025-10-14 13:39:27.37742	2025-10-14 13:39:43.356525
\.


--
-- TOC entry 5019 (class 0 OID 0)
-- Dependencies: 220
-- Name: categories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.categories_id_seq', 12, true);


--
-- TOC entry 5020 (class 0 OID 0)
-- Dependencies: 222
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.products_id_seq', 29, true);


--
-- TOC entry 5021 (class 0 OID 0)
-- Dependencies: 226
-- Name: transaction_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transaction_items_id_seq', 9, true);


--
-- TOC entry 5022 (class 0 OID 0)
-- Dependencies: 224
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 8, true);


--
-- TOC entry 5023 (class 0 OID 0)
-- Dependencies: 218
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 9, true);


--
-- TOC entry 4820 (class 2606 OID 19057)
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- TOC entry 4822 (class 2606 OID 19055)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4829 (class 2606 OID 19073)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 4842 (class 2606 OID 19121)
-- Name: transaction_items transaction_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_items
    ADD CONSTRAINT transaction_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4836 (class 2606 OID 19098)
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- TOC entry 4838 (class 2606 OID 19100)
-- Name: transactions transactions_transaction_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_transaction_code_key UNIQUE (transaction_code);


--
-- TOC entry 4816 (class 2606 OID 19041)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4818 (class 2606 OID 19039)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4823 (class 1259 OID 19058)
-- Name: idx_categories_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_name ON public.categories USING btree (name);


--
-- TOC entry 4824 (class 1259 OID 19080)
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- TOC entry 4825 (class 1259 OID 19081)
-- Name: idx_products_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_is_active ON public.products USING btree (is_active);


--
-- TOC entry 4826 (class 1259 OID 19079)
-- Name: idx_products_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_name ON public.products USING btree (name);


--
-- TOC entry 4827 (class 1259 OID 19082)
-- Name: idx_products_price; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_price ON public.products USING btree (price);


--
-- TOC entry 4839 (class 1259 OID 19133)
-- Name: idx_transaction_items_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transaction_items_product_id ON public.transaction_items USING btree (product_id);


--
-- TOC entry 4840 (class 1259 OID 19132)
-- Name: idx_transaction_items_transaction_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transaction_items_transaction_id ON public.transaction_items USING btree (transaction_id);


--
-- TOC entry 4830 (class 1259 OID 19106)
-- Name: idx_transactions_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_code ON public.transactions USING btree (transaction_code);


--
-- TOC entry 4831 (class 1259 OID 19109)
-- Name: idx_transactions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_created_at ON public.transactions USING btree (created_at DESC);


--
-- TOC entry 4832 (class 1259 OID 19110)
-- Name: idx_transactions_payment_method; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_payment_method ON public.transactions USING btree (payment_method);


--
-- TOC entry 4833 (class 1259 OID 19108)
-- Name: idx_transactions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_status ON public.transactions USING btree (status);


--
-- TOC entry 4834 (class 1259 OID 19107)
-- Name: idx_transactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);


--
-- TOC entry 4812 (class 1259 OID 19042)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4813 (class 1259 OID 19044)
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- TOC entry 4814 (class 1259 OID 19043)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 4848 (class 2620 OID 19136)
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4849 (class 2620 OID 19137)
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4850 (class 2620 OID 19138)
-- Name: transactions update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4847 (class 2620 OID 19135)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4843 (class 2606 OID 19074)
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- TOC entry 4845 (class 2606 OID 19127)
-- Name: transaction_items transaction_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_items
    ADD CONSTRAINT transaction_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- TOC entry 4846 (class 2606 OID 19122)
-- Name: transaction_items transaction_items_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transaction_items
    ADD CONSTRAINT transaction_items_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- TOC entry 4844 (class 2606 OID 19101)
-- Name: transactions transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


-- Completed on 2025-11-17 08:50:17

--
-- PostgreSQL database dump complete
--

\unrestrict KcPQpJ8nHd6qSurUgd2sfzZ1OVDb3U3aVpv4I5Nc4luuVomwPCR1q5n9bBGblWc


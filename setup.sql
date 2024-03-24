
CREATE TABLE public.folders (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	"name" varchar(255) NOT NULL,
	parent_folder_id uuid NULL,
	CONSTRAINT folders_pkey PRIMARY KEY (id),
	CONSTRAINT folders_parent_folder_id_fkey FOREIGN KEY (parent_folder_id) REFERENCES public.folders(id) ON DELETE CASCADE
);

CREATE TABLE public.files (
	id uuid NOT NULL DEFAULT uuid_generate_v4(),
	filename varchar(255) NOT NULL,
	"type" varchar(255) NOT NULL,
	"size" int4 NOT NULL,
	folder_id uuid NOT NULL,
	"storage" varchar(255) NULL,
	title varchar(255) NULL,
	uploaded_by uuid NULL,
	uploaded_on timestamp NULL,
	modified_by uuid NULL,
	filesize int8 NULL,
	width int4 NULL,
	height int4 NULL,
	focal_point_x int4 NULL,
	focal_point_y int4 NULL,
	duration int4 NULL,
	description text NULL,
	"location" varchar(255) NULL,
	tags _text NULL,
	metadata jsonb NULL,
	filename_disk varchar NULL,
	filename_download varchar(255) NULL,
	CONSTRAINT files_pkey PRIMARY KEY (id),
	CONSTRAINT files_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE CASCADE
);
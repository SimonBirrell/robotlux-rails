class Agent < ActiveRecord::Base

	attr_reader :password
	
	belongs_to :org
	belongs_to :user
	has_many :agent_sessions

	validates :slug, presence: true
	validates :org, presence: true
	validates_format_of :slug, :with => /\A[_a-z0-9]+\z/

	validates :slug, uniqueness: {scope: :org, message: 'agent slugs must be unique within org'}

	before_save :auto_generate_name
	before_create :create_user_for_agent

	# Alphabetical order by default
    default_scope  { order("slug ASC") }

	def change_password
		@password = generate_password
		self.user.password = @password
			self.user.password_confirmation = @password
			self.user.save
			@password 
	end

	private

		def auto_generate_name
			self.name = slug.titleize
		end

		def create_user_for_agent
			@password = generate_password
			user = User.create 	email: email, 
								name: name, 
								password: @password, 
								org: org,
								role: :agent
			user.confirm	
			self.user_id = user.id				
		end		

		def email
			"#{slug}@#{org.slug}.orgs.robotlux.com"
		end

		def generate_password
			SecureRandom.urlsafe_base64(25).tr('lIO0', 'sxyz')
		end

end

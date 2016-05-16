class Agent < ActiveRecord::Base

	attr_reader :password
	
	belongs_to :org
	belongs_to :user, dependent: :destroy
	has_many :agent_sessions

	validates :slug, presence: true
	validates :org, presence: true
	validates_format_of :slug, :with => /\A[_a-z0-9]+\z/

	validates :slug, uniqueness: {scope: :org, message: 'agent slugs must be unique within org'}

	before_save :auto_generate_name
	before_create :create_user_for_agent
	before_create :set_default_network

	# Alphabetical order by default
    default_scope  { order("slug ASC") }

	def change_password
		@password = generate_password
		self.user.password = @password
			self.user.password_confirmation = @password
			self.user.save
			@password 
	end

	def logon(params={})
		@params = params
		new_auth_token = reset_authentication_token
		robot_instance = get_robot_instance
		robot_instance_session = get_robot_instance_session(robot_instance)
		agent_session = start_agent_session(robot_instance_session)
        LuxserverInterface.set_agent_details(new_auth_token, {
        	"slug" => slug,
        	"username" => username,
        	"org_slug" => org.slug,
        	"network" => network
        	})
	end

	def logoff(auth_token)
		agent_session = self.agent_sessions.last
		agent_session.stop
		LuxserverInterface.delete_agent_details(auth_token)
	end

	def username
		"#{slug}@#{org.slug}.orgs.robotlux.com"
	end

	private

		def start_agent_session(robot_instance_session)
			hostname = @params['hostname'] || 'unknown_hostname'
			ros_master_uri = @params['ros_master_uri'] || 'unknown_ros_master_uri'
			start_time = Time.zone.now
			agent_session = AgentSession.create agent_id: self.id, 
												start_time: start_time,
												hostname: hostname,
												ros_master_uri: ros_master_uri,
												robot_instance_session: robot_instance_session
		end

		def get_robot_instance_session(robot_instance)
			robot_instance_session = RobotInstanceSession.
										where(robot_instance: robot_instance).
										where('end_session IS NULL').
										last
			robot_instance_session ||= RobotInstanceSession.create robot_instance: robot_instance, start_session: Time.zone.now				
		end

		def get_robot_instance
			master_key = @params['master_key']
			network = @params['network']
			launch_command = @params['launch_command']
			robot_instance = RobotInstance.where(org_id: org_id).
											where(master_key: master_key).
											where(network: network).
											where(launch_command: launch_command).
											first
			robot_instance ||= RobotInstance.create org_id: org_id, master_key: master_key, network: network, launch_command: launch_command								
		end

		def reset_authentication_token
			new_auth_token = user.reset_authentication_token!
			user.save!
			new_auth_token
		end

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

		def set_default_network
			self.network ||= "0"
		end

end

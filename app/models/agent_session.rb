class AgentSession < ActiveRecord::Base

	belongs_to :agent

	validates :start_time, presence: true
	validates :agent, presence: true
	validates :hostname, presence: true
	validates :ros_master_uri, presence: true

end

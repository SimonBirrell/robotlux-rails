class LuxserverInterface

	def self.set_agent_details(auth_token, details)
		$redis.set agent_key(auth_token), details.to_json
	end

	def self.set_browser_details(auth_token, details)
		$redis.set browser_key(auth_token), details.to_json
	end

	def self.get_agent_details(auth_token)
		json = $redis.get agent_key(auth_token)
		return nil if json.nil?
		JSON.parse(json)
	end

	def self.get_browser_details(auth_token)
		json = $redis.get browser_key(auth_token)
		return nil if json.nil?
		JSON.parse(json)
	end

	def self.delete_agent_details(auth_token)
		$redis.del agent_key(auth_token)
	end

	def self.delete_browser_details(auth_token)
		$redis.del browser_key(auth_token)
	end

	private

		def self.agent_key(auth_token)
			"agent:#{auth_token}"
		end

		def self.browser_key(auth_token)
			"browser:#{auth_token}"
		end

end
